import type { SignalEnvelope } from "@acpp/core";
import { AcppHttpError } from "./errors.js";

export type AcppClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text) as unknown;
}

/**
 * Reference HTTP client for the hosted Developer API (A-010 stub).
 * Does not auto-approve or execute protected operations — callers pass explicit payloads.
 */
export class AcppClient {
  readonly #base: string;
  readonly #fetch: typeof fetch;

  constructor(options: AcppClientOptions) {
    this.#base = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetch ?? fetch;
  }

  async health(): Promise<{ ok: boolean; protocolVersion: string }> {
    return this.#json("GET", "/health");
  }

  async getDeveloperCatalog(): Promise<{
    protocolVersion: string;
    documentation: string;
    routes: readonly { method: string; path: string; summary: string }[];
  }> {
    return this.#json("GET", "/v1");
  }

  async createWorkspace(input: {
    id: string;
    slug: string;
    displayName: string;
  }): Promise<{ workspace: { workspaceId: string; slug: string; displayName: string } }> {
    return this.#json("POST", "/v1/workspaces", input);
  }

  async getWorkspace(workspaceId: string): Promise<{
    workspace: { workspaceId: string; slug: string; displayName: string };
  }> {
    return this.#json("GET", `/v1/workspaces/${encodeURIComponent(workspaceId)}`);
  }

  async registerIdentity(
    workspaceId: string,
    input: {
      actorType: string;
      actorId?: string;
      displayName: string;
      publicKey: string;
    },
  ): Promise<{
    identity: { address: string };
    key: { keyId: string };
  }> {
    return this.#json(
      "POST",
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/identities`,
      input,
    );
  }

  async verifySignature(input: {
    address: string;
    keyId: string;
    message: string;
    signature: string;
  }): Promise<{ ok: boolean }> {
    return this.#json("POST", "/v1/verify", input);
  }

  async submitSignal(envelope: SignalEnvelope): Promise<unknown> {
    return this.#json("POST", "/v1/signals", envelope);
  }

  async getSignal(signalId: string): Promise<unknown> {
    return this.#json("GET", `/v1/signals/${encodeURIComponent(signalId)}`);
  }

  async listGrants(input: {
    workspaceId: string;
    subject?: string;
  }): Promise<{ grants: { grantId: string; revokedAt?: string }[] }> {
    const params = new URLSearchParams({ workspaceId: input.workspaceId });
    if (input.subject) {
      params.set("subject", input.subject);
    }
    return this.#json("GET", `/v1/grants?${params.toString()}`);
  }

  async createGrant(input: {
    workspaceId: string;
    grantedBy: string;
    subject: string;
    resource: string;
    action: string;
    expiresAt?: string;
    requiresApproval?: boolean;
    grantId?: string;
  }): Promise<{ grant: { grantId: string } }> {
    return this.#json("POST", "/v1/grants", input);
  }

  async revokeGrant(
    grantId: string,
    input: { workspaceId: string },
  ): Promise<{ grant: { grantId: string; revokedAt?: string } }> {
    return this.#json(
      "POST",
      `/v1/grants/${encodeURIComponent(grantId)}/revoke`,
      input,
    );
  }

  async evaluateAuthorization(input: {
    workspaceId: string;
    subject: string;
    resource: string;
    action: string;
    at?: string;
  }): Promise<{ decision: { allow: boolean; reason: string } }> {
    return this.#json("POST", "/v1/authorization/evaluate", input);
  }

  async gateExecute(input: {
    workspaceId: string;
    subject: string;
    resource: string;
    action: string;
    payload?: unknown;
    payloadHash?: string;
    approvalId?: string;
    at?: string;
  }): Promise<{ gate: { allowed: boolean } }> {
    return this.#json("POST", "/v1/authorization/execute", input);
  }

  async connectGithub(
    workspaceId: string,
    input: { installationId: string; accessToken: string },
  ): Promise<{ connection: { connectionId: string; credentialRef: string } }> {
    return this.#json(
      "POST",
      `/v1/workspaces/${encodeURIComponent(workspaceId)}/connections/github`,
      input,
    );
  }

  async executeGithubAction(input: {
    workspaceId: string;
    connectionId: string;
    subject: string;
    repo: string;
    action: string;
    payload?: unknown;
    payloadHash?: string;
    approvalId?: string;
    signalId?: string;
    recordReceipt?: boolean;
  }): Promise<{ gate: { allowed: boolean }; execution?: { ok: boolean }; receipt?: unknown }> {
    return this.#json("POST", "/v1/github/actions/execute", input);
  }

  async getReceipt(
    receiptId: string,
    workspaceId: string,
  ): Promise<{ receipt: unknown }> {
    return this.#json(
      "GET",
      `/v1/receipts/${encodeURIComponent(receiptId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  }

  async #json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.#fetch(`${this.#base}${path}`, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const parsed = await readJson(res);
    if (!res.ok) {
      throw new AcppHttpError(res.status, parsed);
    }
    return parsed as T;
  }
}
