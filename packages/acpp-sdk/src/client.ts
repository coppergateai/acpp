import type { ActorAddress, SignalEnvelope } from "@acpp/core";
import { githubResource, type GithubProtectedAction } from "@acpp/github";
import type { AuthorizationDecision, ExecutionGate } from "@acpp/policy";
import { hashActionPayload } from "@acpp/policy";
import type { Receipt } from "@acpp/receipts";
import {
  approvalIdFromProof,
  assertProofMatchesDecision,
  type ExecutionAuthorizationProof,
} from "./authz.js";

export type AcppHostedClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

type JsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: unknown };

async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export class AcppHostedClient {
  private readonly base: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AcppHostedClientOptions) {
    this.base = options.baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetch ?? fetch;
  }

  private async postJson<T>(
    path: string,
    body: unknown,
  ): Promise<JsonResult<T>> {
    const res = await this.fetchFn(`${this.base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson<T>(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, data };
  }

  private async getJson<T>(path: string): Promise<JsonResult<T>> {
    const res = await this.fetchFn(`${this.base}${path}`);
    const data = await readJson<T>(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, data };
  }

  /** Cryptographic verification against enrolled keys (identity ≠ authorization). */
  async verifySignature(input: {
    address: ActorAddress;
    keyId: string;
    message: string;
    signature: string;
  }): Promise<{ ok: boolean; reason?: string }> {
    const result = await this.postJson<{ ok: boolean; reason?: string }>(
      "/v1/verify",
      input,
    );
    if (!result.ok) {
      return { ok: false, reason: "http_error" };
    }
    return result.data;
  }

  async submitSignal(envelope: SignalEnvelope): Promise<
    | { ok: true; signalId: string }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.postJson<{ signal?: { signalId: string } }>(
      "/v1/signals",
      envelope,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    const signalId = result.data.signal?.signalId ?? envelope.signalId;
    return { ok: true, signalId };
  }

  async evaluateAuthorization(input: {
    workspaceId: string;
    subject: ActorAddress;
    resource: string;
    action: string;
    at?: string;
  }): Promise<
    | { ok: true; decision: AuthorizationDecision }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.postJson<{ decision: AuthorizationDecision }>(
      "/v1/authorization/evaluate",
      input,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return { ok: true, decision: result.data.decision };
  }

  /**
   * Record an approver decision. Separate from execute — SDK never auto-approves.
   */
  async recordApproval(input: {
    grantId: string;
    subject: ActorAddress;
    resource: string;
    action: string;
    payload?: unknown;
    payloadHash?: string;
    approved: boolean;
  }): Promise<
    | { ok: true; approval: { approvalId: string } }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.postJson<{ approval: { approvalId: string } }>(
      "/v1/approvals",
      input,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return { ok: true, approval: result.data.approval };
  }

  async gateProtectedExecution(input: {
    workspaceId: string;
    subject: ActorAddress;
    resource: string;
    action: string;
    payload?: unknown;
    payloadHash?: string;
    approvalId?: string;
    at?: string;
  }): Promise<
    | { ok: true; gate: ExecutionGate; status: number }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.postJson<{ gate: ExecutionGate }>(
      "/v1/authorization/execute",
      input,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return { ok: true, gate: result.data.gate, status: result.status };
  }

  /**
   * Execute a GitHub protected action when policy allows.
   * Requires an explicit {@link ExecutionAuthorizationProof} from a prior evaluate (+ approval if needed).
   * This method does not evaluate policy or record approvals on your behalf.
   */
  async executeGithubProtectedAction(input: {
    workspaceId: string;
    connectionId: string;
    subject: ActorAddress;
    repo: string;
    action: GithubProtectedAction;
    payload?: unknown;
    payloadHash?: string;
    signalId?: string;
    recordReceipt?: boolean;
    proof: ExecutionAuthorizationProof;
    /** Must match the decision embedded in `proof` (from evaluateAuthorization). */
    decision: AuthorizationDecision;
    at?: string;
  }): Promise<
    | {
        ok: true;
        execution: { ok: boolean; externalRef?: string; error?: string };
        receipt?: Receipt;
      }
    | { ok: false; status: number; error: unknown; gate?: ExecutionGate }
  > {
    assertProofMatchesDecision(input.proof, input.decision);
    const payloadHash =
      input.payloadHash ??
      (input.payload !== undefined ? hashActionPayload(input.payload) : undefined);
    if (payloadHash === undefined) {
      return { ok: false, status: 400, error: { error: "missing_payload" } };
    }

    const resource = githubResource(input.repo);
    const approvalId = approvalIdFromProof(input.proof);

    const result = await this.postJson<{
      execution: { ok: boolean; externalRef?: string; error?: string };
      receipt?: Receipt;
      gate?: ExecutionGate;
    }>("/v1/github/actions/execute", {
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      subject: input.subject,
      repo: input.repo,
      action: input.action,
      payload: input.payload,
      payloadHash,
      approvalId,
      signalId: input.signalId,
      recordReceipt: input.recordReceipt,
      at: input.at,
    });

    if (!result.ok) {
      const gate =
        typeof result.error === "object" &&
        result.error !== null &&
        "gate" in result.error
          ? (result.error as { gate?: ExecutionGate }).gate
          : undefined;
      return { ok: false, status: result.status, error: result.error, gate };
    }
    return {
      ok: true,
      execution: result.data.execution,
      receipt: result.data.receipt,
    };
  }

  async getReceipt(
    receiptId: string,
    workspaceId: string,
  ): Promise<
    | { ok: true; receipt: Receipt }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.getJson<{ receipt: Receipt }>(
      `/v1/receipts/${encodeURIComponent(receiptId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return { ok: true, receipt: result.data.receipt };
  }

  async getSignalReceipt(
    signalId: string,
    workspaceId: string,
  ): Promise<
    | { ok: true; receipt: Receipt }
    | { ok: false; status: number; error: unknown }
  > {
    const result = await this.getJson<{ receipt: Receipt }>(
      `/v1/signals/${encodeURIComponent(signalId)}/receipt?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return { ok: true, receipt: result.data.receipt };
  }
}
