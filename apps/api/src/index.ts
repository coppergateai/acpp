import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ACPP_PROTOCOL_VERSION,
  isActorAddress,
  isSignalReferenceId,
  type ActorAddress,
  type SignalEnvelope,
} from "@acpp/core";
import type { WorkspaceId } from "@acpp/db";
import {
  ConnectionStore,
  ExecutionStore,
  GrantStore,
  IdentityRegistry,
  ReceiptStore,
  SignalStore,
  isWorkspaceId,
  type StoredGithubConnection,
} from "@acpp/db";
import {
  executionOutcomeFromGate,
  executionOutcomeFromGithub,
} from "@acpp/receipts";
import {
  executeGithubAction,
  githubResource,
  type GithubHttpClient,
  type GithubProtectedAction,
} from "@acpp/github";
import {
  discoverIdentityCapabilities,
  discoverMcpToolCapabilities,
} from "@acpp/discovery";
import {
  assertSafeMcpServerEndpoint,
  evaluateMcpGatewayPrecheck,
  isToolOnConnectionAllowlist,
  mcpResource,
  sanitizeMcpToolResult,
} from "@acpp/mcp";
import { hashActionPayload } from "@acpp/policy";
import {
  loadHostedOpenApi,
  loadProtocolManifest,
  loadProtocolSchema,
} from "@acpp/schemas";
import { runWedgeRevokeProof } from "./wedge-proof.js";

export type ApiServerOptions = {
  registry?: IdentityRegistry;
  signals?: SignalStore;
  grants?: GrantStore;
  connections?: ConnectionStore;
  receipts?: ReceiptStore;
  executions?: ExecutionStore;
  githubHttp?: GithubHttpClient;
};

const GITHUB_ACTIONS = new Set<string>(["issues.comment", "repos.metadata.read"]);

function publicGithubConnection(row: StoredGithubConnection) {
  return {
    connectionId: row.connectionId,
    workspaceId: row.workspaceId,
    installationId: row.installationId,
    credentialRef: row.credentialRef,
    createdAt: row.createdAt,
  };
}

function publicMcpConnection(row: {
  connectionId: string;
  workspaceId: string;
  serverUrl: string;
  credentialRef: string;
  allowedTools: string[];
  createdAt: string;
}) {
  return {
    connectionId: row.connectionId,
    workspaceId: row.workspaceId,
    serverUrl: row.serverUrl,
    credentialRef: row.credentialRef,
    allowedTools: row.allowedTools,
    createdAt: row.createdAt,
  };
}

async function callRemoteMcpTool(input: {
  serverUrl: string;
  toolName: string;
  args?: Record<string, unknown>;
  bearerToken?: string;
}): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const safety = assertSafeMcpServerEndpoint(input.serverUrl, {
    allowLocalhost: process.env.NODE_ENV !== "production",
  });
  if (!safety.ok) {
    return { ok: false, error: `unsafe_endpoint:${safety.reason}` };
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (input.bearerToken) {
      headers.Authorization = `Bearer ${input.bearerToken}`;
    }
    const res = await fetch(input.serverUrl.replace(/\/+$/, ""), {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: input.toolName,
          arguments: input.args ?? {},
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `mcp_http_${res.status}` };
    }
    const body = (await res.json()) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (body.error) {
      return {
        ok: false,
        error: body.error.message ?? "mcp_rpc_error",
      };
    }
    const raw =
      body.result && typeof body.result === "object"
        ? (body.result as Record<string, unknown>)
        : { result: body.result };
    return { ok: true, result: sanitizeMcpToolResult(raw) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * HTTP API — health, identity (P-010), signals (S-010), grants/authz (SEC-010). Broader Developer API: A-010.
 */
export function createApiServer(options: ApiServerOptions = {}) {
  const registry = options.registry ?? new IdentityRegistry();
  const grants = options.grants ?? new GrantStore(registry.workspace);
  const signals = options.signals ?? new SignalStore(registry);
  const connections =
    options.connections ?? new ConnectionStore(registry.workspace);
  const receipts =
    options.receipts ?? new ReceiptStore(registry.workspace);
  const executions = options.executions ?? new ExecutionStore();
  const githubHttp = options.githubHttp;

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;

    if (path === "/health" || path === "/ready") {
      sendJson(res, 200, { ok: true, protocolVersion: ACPP_PROTOCOL_VERSION });
      return;
    }

    if (req.method === "GET" && path === "/v1/openapi.json") {
      sendJson(res, 200, loadHostedOpenApi());
      return;
    }

    if (req.method === "GET" && path === "/v1/protocol/schemas") {
      sendJson(res, 200, loadProtocolManifest());
      return;
    }

    const protocolSchemaMatch = path.match(
      /^\/v1\/protocol\/schemas\/([a-z0-9-]+)$/,
    );
    if (req.method === "GET" && protocolSchemaMatch) {
      const schemaId = protocolSchemaMatch[1]!;
      const schema = loadProtocolSchema(schemaId);
      if (!schema) {
        sendJson(res, 404, { error: "schema_not_found" });
        return;
      }
      sendJson(res, 200, schema);
      return;
    }

    if (req.method === "POST" && path === "/v1/workspaces") {
      const body = (await readJsonBody(req)) as {
        id?: string;
        slug?: string;
        displayName?: string;
      };
      if (!body.id || !body.slug || !body.displayName) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const workspace = registry.workspace.createWorkspace({
          id: body.id,
          slug: body.slug,
          displayName: body.displayName,
        });
        sendJson(res, 201, { workspace });
      } catch (err) {
        sendJson(res, 409, {
          error: "workspace_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const workspaceIdentityMatch = path.match(
      /^\/v1\/workspaces\/(ws_[A-Za-z0-9_-]+)\/identities$/,
    );
    if (req.method === "POST" && workspaceIdentityMatch) {
      const workspaceIdRaw = workspaceIdentityMatch[1];
      if (!workspaceIdRaw || !isWorkspaceId(workspaceIdRaw)) {
        sendJson(res, 400, { error: "invalid_workspace" });
        return;
      }
      const workspaceId = workspaceIdRaw;
      const body = (await readJsonBody(req)) as {
        actorType?: string;
        actorId?: string;
        displayName?: string;
        publicKey?: string;
      };
      if (
        !body.actorType ||
        !body.displayName ||
        !body.publicKey ||
        !["human", "agent", "service", "organization", "application"].includes(
          body.actorType,
        )
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      if (!registry.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      try {
        const result = registry.registerIdentity({
          workspaceId,
          actorType: body.actorType as "agent",
          actorId: body.actorId,
          displayName: body.displayName,
          publicKey: body.publicKey,
        });
        sendJson(res, 201, result);
      } catch (err) {
        sendJson(res, 409, {
          error: "registration_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const addressInPath =
      /^\/v1\/identities\/(acpp:(?:human|agent|service|organization|application):[A-Za-z0-9_-]+)(?:\/|$)/;
    const addressMatch = path.match(addressInPath);
    if (addressMatch) {
      const addressRaw = decodeURIComponent(addressMatch[1]!);
      if (!isActorAddress(addressRaw)) {
        sendJson(res, 400, { error: "invalid_address" });
        return;
      }
      const address = addressRaw;

      if (req.method === "POST" && path === `/v1/identities/${address}/keys/rotate`) {
        const body = (await readJsonBody(req)) as { newPublicKey?: string };
        if (!body.newPublicKey) {
          sendJson(res, 400, { error: "invalid_body" });
          return;
        }
        try {
          const key = registry.rotateKey({
            address,
            newPublicKey: body.newPublicKey,
          });
          sendJson(res, 200, { key });
        } catch (err) {
          sendJson(res, 400, {
            error: "rotate_failed",
            message: err instanceof Error ? err.message : String(err),
          });
        }
        return;
      }

      if (req.method === "POST" && path === `/v1/identities/${address}/suspend`) {
        try {
          const identity = registry.suspendIdentity(address);
          sendJson(res, 200, { identity });
        } catch {
          sendJson(res, 404, { error: "not_found" });
        }
        return;
      }

      if (req.method === "GET" && path === `/v1/identities/${address}`) {
        const identity = registry.getIdentity(address);
        if (!identity) {
          sendJson(res, 404, { error: "not_found" });
          return;
        }
        sendJson(res, 200, {
          identity,
          keys: registry.listKeys(address),
        });
        return;
      }

      if (req.method === "GET" && path === `/v1/identities/${address}/capabilities`) {
        const workspaceId = url.searchParams.get("workspaceId");
        const requesterRaw = url.searchParams.get("requester") ?? address;
        const subjectRaw = url.searchParams.get("subject") ?? address;
        if (!workspaceId || !isWorkspaceId(workspaceId)) {
          sendJson(res, 400, { error: "missing_or_invalid_workspace" });
          return;
        }
        if (!isActorAddress(requesterRaw) || !isActorAddress(subjectRaw)) {
          sendJson(res, 400, { error: "invalid_requester_or_subject" });
          return;
        }
        if (subjectRaw !== address) {
          sendJson(res, 400, { error: "subject_must_match_identity" });
          return;
        }
        const actor = registry.workspace.getActor(address);
        if (!actor || actor.workspaceId !== workspaceId) {
          sendJson(res, 404, { error: "not_found" });
          return;
        }
        const identity = registry.getIdentity(address);
        if (!identity) {
          sendJson(res, 404, { error: "not_found" });
          return;
        }
        const grantRows = grants.listGrants({ workspaceId });
        const policyGrants = grantRows.map((g) => ({
          grantId: g.grantId,
          subject: g.subject,
          resource: g.resource,
          action: g.action,
          expiresAt: g.expiresAt,
          revokedAt: g.revokedAt,
          requiresApproval: g.requiresApproval,
        }));
        const result = discoverIdentityCapabilities({
          identity: {
            address: identity.address,
            actorType: identity.actorType,
            displayName: identity.displayName,
            status: identity.status,
          },
          subject: subjectRaw,
          requester: requesterRaw,
          grants: policyGrants,
        });
        if (!result.ok) {
          sendJson(res, 403, {
            error: "discovery_denied",
            reason: result.reason,
            discoveryIsNotConsent: true,
          });
          return;
        }
        sendJson(res, 200, result.discovery);
        return;
      }
    }

    if (req.method === "GET" && path === "/v1/mcp/capabilities") {
      const workspaceId = url.searchParams.get("workspaceId");
      const subjectRaw = url.searchParams.get("subject");
      const connectionId = url.searchParams.get("connectionId");
      const allowedToolsRaw = url.searchParams.get("allowedTools");
      if (
        !workspaceId ||
        !isWorkspaceId(workspaceId) ||
        !subjectRaw ||
        !isActorAddress(subjectRaw) ||
        !connectionId
      ) {
        sendJson(res, 400, { error: "invalid_query" });
        return;
      }
      if (!registry.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      const actor = registry.workspace.getActor(subjectRaw);
      if (!actor || actor.workspaceId !== workspaceId) {
        sendJson(res, 404, { error: "subject_not_found" });
        return;
      }
      const connectionAllowedTools = allowedToolsRaw
        ? allowedToolsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const grantRows = grants.listGrants({ workspaceId, subject: subjectRaw });
      const policyGrants = grantRows.map((g) => ({
        grantId: g.grantId,
        subject: g.subject,
        resource: g.resource,
        action: g.action,
        expiresAt: g.expiresAt,
        revokedAt: g.revokedAt,
        requiresApproval: g.requiresApproval,
      }));
      const discovery = discoverMcpToolCapabilities({
        workspaceId,
        subject: subjectRaw,
        connectionId,
        grants: policyGrants,
        connectionAllowedTools,
      });
      sendJson(res, 200, discovery);
      return;
    }

    const workspaceMcpConnectMatch = path.match(
      /^\/v1\/workspaces\/(ws_[A-Za-z0-9_-]+)\/connections\/mcp$/,
    );
    if (req.method === "POST" && workspaceMcpConnectMatch) {
      const workspaceIdRaw = workspaceMcpConnectMatch[1];
      if (!workspaceIdRaw || !isWorkspaceId(workspaceIdRaw)) {
        sendJson(res, 400, { error: "invalid_workspace" });
        return;
      }
      const workspaceId = workspaceIdRaw;
      const body = (await readJsonBody(req)) as {
        serverUrl?: string;
        allowedTools?: string[];
        accessToken?: string;
      };
      if (
        !body.serverUrl ||
        !Array.isArray(body.allowedTools) ||
        body.allowedTools.length === 0
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const safety = assertSafeMcpServerEndpoint(body.serverUrl, {
        allowLocalhost: process.env.NODE_ENV !== "production",
      });
      if (!safety.ok) {
        sendJson(res, 400, { error: "unsafe_endpoint", reason: safety.reason });
        return;
      }
      if (!connections.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      try {
        const connection = connections.connectMcp({
          workspaceId,
          serverUrl: body.serverUrl,
          allowedTools: body.allowedTools,
          accessToken: body.accessToken,
        });
        sendJson(res, 201, { connection: publicMcpConnection(connection) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes("already exists") ? 409 : 400;
        sendJson(res, status, { error: "connect_failed", message });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/mcp/tools/invoke") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        connectionId?: string;
        subject?: string;
        toolName?: string;
        arguments?: Record<string, unknown>;
        approvalId?: string;
        at?: string;
        payloadHash?: string;
        signalId?: string;
        recordReceipt?: boolean;
      };
      if (
        !body.workspaceId ||
        !body.connectionId ||
        !body.subject ||
        !body.toolName ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const connection = connections.getMcpConnection(
        body.connectionId,
        body.workspaceId,
      );
      if (!connection) {
        sendJson(res, 404, { error: "connection_not_found" });
        return;
      }
      const resource = mcpResource(body.connectionId, body.toolName);
      const payloadHash =
        body.payloadHash ??
        hashActionPayload({
          toolName: body.toolName,
          arguments: body.arguments ?? {},
        });
      try {
        const gate = grants.gateProtectedAction(
          {
            workspaceId: body.workspaceId,
            subject: body.subject,
            resource,
            action: "mcp.tools.call",
            at: body.at,
          },
          { payloadHash },
          body.approvalId,
        );
        const precheck = evaluateMcpGatewayPrecheck({
          authenticated: true,
          connectionFound: true,
          authorized: gate.allowed,
          toolAllowed: isToolOnConnectionAllowlist(
            connection.allowedTools,
            body.toolName,
          ),
          argumentsValid: true,
          withinRateLimit: true,
          approvalSatisfied: gate.allowed,
        });
        if (!gate.allowed || !precheck.proceedToExecution) {
          sendJson(res, 403, {
            gate,
            precheck,
            error: precheck.reason || "policy_denied",
          });
          return;
        }
        const token = connections.resolveCredential(connection.credentialRef);
        const execution = await callRemoteMcpTool({
          serverUrl: connection.serverUrl,
          toolName: body.toolName,
          args: body.arguments,
          bearerToken: token,
        });
        if (!execution.ok) {
          sendJson(res, 502, {
            gate,
            error: execution.error,
            execution: { ok: false, reason: execution.error },
          });
          return;
        }
        sendJson(res, 200, {
          gate,
          result: execution.result,
          execution: { ok: true },
        });
      } catch (err) {
        sendJson(res, 403, {
          error: "tenant_boundary",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "GET" && path === "/v1/signals") {
      const correlationId = url.searchParams.get("correlationId");
      if (!correlationId) {
        sendJson(res, 400, { error: "missing_correlation_id_query" });
        return;
      }
      if (!isSignalReferenceId(correlationId)) {
        sendJson(res, 400, { error: "invalid_correlation_id" });
        return;
      }
      const records = signals.listSignalsByCorrelationId(correlationId);
      sendJson(res, 200, {
        correlationId,
        signals: records.map((signal) => ({
          signal,
          delivery: signals.getDelivery(signal.signalId),
        })),
      });
      return;
    }

    const signalReceiptMatch = path.match(
      /^\/v1\/signals\/([A-Za-z0-9_-]{8,128})\/receipt$/,
    );
    if (req.method === "GET" && signalReceiptMatch) {
      const signalId = signalReceiptMatch[1]!;
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      const signal = signals.getSignal(signalId);
      if (!signal || signal.workspaceId !== workspaceId) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      const receipt = receipts.getReceiptBySignalId(signalId, workspaceId);
      if (!receipt) {
        sendJson(res, 404, { error: "receipt_not_found" });
        return;
      }
      sendJson(res, 200, { receipt, signal: signal.envelope });
      return;
    }

    const signalMatch = path.match(/^\/v1\/signals\/([A-Za-z0-9_-]{8,128})$/);
    if (req.method === "GET" && signalMatch) {
      const signalId = signalMatch[1]!;
      const signal = signals.getSignal(signalId);
      if (!signal) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      const delivery = signals.getDelivery(signalId);
      sendJson(res, 200, { signal, delivery });
      return;
    }

    if (req.method === "GET" && path === "/v1/receipts") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      if (!receipts.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      const rows = receipts.listReceipts({ workspaceId });
      sendJson(res, 200, { receipts: rows });
      return;
    }

    const receiptMatch = path.match(/^\/v1\/receipts\/([A-Za-z0-9_-]{8,128})$/);
    if (req.method === "GET" && receiptMatch) {
      const receiptId = receiptMatch[1]!;
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      const receipt = receipts.getReceipt(receiptId, workspaceId);
      if (!receipt) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      sendJson(res, 200, { receipt });
      return;
    }

    if (req.method === "POST" && path === "/v1/receipts") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        signalId?: string;
        sender?: string;
        verificationOk?: boolean;
        decision?: {
          decisionId: string;
          allow: boolean;
          reason: string;
          grantId?: string;
          requiresApproval: boolean;
          evaluatedAt: string;
        };
        approvalId?: string;
        execution?: {
          status: string;
          externalRef?: string;
          error?: string;
          note?: string;
          reason?: string;
        };
      };
      if (
        !body.workspaceId ||
        !body.signalId ||
        !body.sender ||
        body.verificationOk === undefined ||
        !body.decision ||
        !body.execution ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.sender)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const signal = signals.getSignal(body.signalId);
      if (!signal || signal.workspaceId !== body.workspaceId) {
        sendJson(res, 404, { error: "signal_not_found" });
        return;
      }
      try {
        const receipt = receipts.recordReceipt({
          workspaceId: body.workspaceId,
          signalId: body.signalId,
          sender: body.sender,
          verificationOk: body.verificationOk,
          decision: body.decision,
          approvalId: body.approvalId,
          execution: body.execution as import("@acpp/receipts").ExecutionOutcome,
        });
        sendJson(res, 201, { receipt });
      } catch (err) {
        sendJson(res, 409, {
          error: "receipt_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/demo/wedge-revoke-proof") {
      try {
        const mockFetch: typeof fetch = async (input, init) => {
          const urlStr = String(input);
          if (urlStr.includes("/issues/") && init?.method === "POST") {
            return new Response(JSON.stringify({ id: 1, html_url: "https://example.test/1" }), {
              status: 201,
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        };
        const result = await runWedgeRevokeProof({
          registry,
          signals,
          grants,
          connections,
          receipts,
          githubHttp: githubHttp ?? { fetch: mockFetch },
        });
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, {
          error: "wedge_proof_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/signals") {
      const body = (await readJsonBody(req)) as SignalEnvelope;
      const result = signals.submitSignal(body);
      if (!result.ok) {
        if (result.reason === "replay_rejected" || result.reason === "signal_id_conflict") {
          sendJson(res, 409, {
            error: result.reason,
            existing: result.existing,
          });
          return;
        }
        const status =
          result.reason === "invalid_envelope" ||
          result.reason === "invalid_signature" ||
          result.reason === "unknown_key" ||
          result.reason === "key_not_active" ||
          result.reason === "unknown_causation"
            ? 400
            : result.reason === "unknown_identity"
              ? 404
              : 403;
        sendJson(res, status, {
          error: result.reason,
          detail: result.detail,
        });
        return;
      }
      sendJson(res, 201, {
        signal: result.signal,
        delivery: result.delivery,
      });
      return;
    }

    if (req.method === "GET" && path === "/v1/grants") {
      const workspaceId = url.searchParams.get("workspaceId");
      const subject = url.searchParams.get("subject") ?? undefined;
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      if (subject && !isActorAddress(subject)) {
        sendJson(res, 400, { error: "invalid_subject" });
        return;
      }
      const rows = grants.listGrants({
        workspaceId,
        subject: subject as ActorAddress | undefined,
      });
      sendJson(res, 200, { grants: rows });
      return;
    }

    if (req.method === "POST" && path === "/v1/grants") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        grantedBy?: string;
        subject?: string;
        resource?: string;
        action?: string;
        expiresAt?: string;
        requiresApproval?: boolean;
        grantId?: string;
      };
      if (
        !body.workspaceId ||
        !body.grantedBy ||
        !body.subject ||
        !body.resource ||
        !body.action ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.grantedBy) ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      if (!grants.workspace.getWorkspace(body.workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      try {
        const grant = grants.createGrant({
          grantId: body.grantId,
          workspaceId: body.workspaceId,
          grantedBy: body.grantedBy,
          subject: body.subject,
          resource: body.resource,
          action: body.action,
          expiresAt: body.expiresAt,
          requiresApproval: body.requiresApproval,
        });
        sendJson(res, 201, { grant });
      } catch (err) {
        sendJson(res, 409, {
          error: "grant_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const revokeMatch = path.match(/^\/v1\/grants\/([A-Za-z0-9_-]+)\/revoke$/);
    if (req.method === "POST" && revokeMatch) {
      const grantId = revokeMatch[1]!;
      const body = (await readJsonBody(req)) as { workspaceId?: string };
      if (!body.workspaceId || !isWorkspaceId(body.workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      try {
        const grant = grants.revokeGrant(grantId, {
          workspaceId: body.workspaceId,
        });
        sendJson(res, 200, { grant });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status =
          message.startsWith("Unknown grant") ||
          message.startsWith("Tenant isolation")
            ? 404
            : 409;
        sendJson(res, status, { error: "revoke_failed", message });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/authorization/evaluate") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        subject?: string;
        resource?: string;
        action?: string;
        at?: string;
      };
      if (
        !body.workspaceId ||
        !body.subject ||
        !body.resource ||
        !body.action ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const decision = grants.evaluateAuthorization({
          workspaceId: body.workspaceId,
          subject: body.subject,
          resource: body.resource,
          action: body.action,
          at: body.at,
        });
        sendJson(res, 200, { decision });
      } catch (err) {
        sendJson(res, 403, {
          error: "tenant_boundary",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/approvals/requests") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        grantId?: string;
        subject?: string;
        resource?: string;
        action?: string;
        payloadHash?: string;
        payload?: unknown;
        reason?: string;
        context?: string;
        risks?: string[];
        expiresAt?: string;
      };
      const payloadHash =
        body.payloadHash ??
        (body.payload !== undefined ? hashActionPayload(body.payload) : undefined);
      if (
        !body.workspaceId ||
        !body.grantId ||
        !body.subject ||
        !body.resource ||
        !body.action ||
        payloadHash === undefined ||
        !body.expiresAt ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const request = grants.createApprovalRequest({
          workspaceId: body.workspaceId,
          grantId: body.grantId,
          subject: body.subject,
          resource: body.resource,
          action: body.action,
          payloadHash,
          reason: body.reason,
          context: body.context,
          risks: body.risks,
          expiresAt: body.expiresAt,
        });
        sendJson(res, 201, { request });
      } catch (err) {
        sendJson(res, 409, {
          error: "approval_request_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "GET" && path === "/v1/approvals") {
      const workspaceId = url.searchParams.get("workspaceId");
      const status = url.searchParams.get("status") ?? undefined;
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      if (
        status &&
        status !== "pending" &&
        status !== "approved" &&
        status !== "denied" &&
        status !== "expired"
      ) {
        sendJson(res, 400, { error: "invalid_status" });
        return;
      }
      const requests = grants.listApprovalRequests({
        workspaceId,
        status: status as
          | "pending"
          | "approved"
          | "denied"
          | "expired"
          | undefined,
      });
      sendJson(res, 200, { requests });
      return;
    }

    const approvalDecideMatch = path.match(
      /^\/v1\/approvals\/([A-Za-z0-9_-]{8,128})\/decide$/,
    );
    if (req.method === "POST" && approvalDecideMatch) {
      const requestId = approvalDecideMatch[1]!;
      const body = (await readJsonBody(req)) as {
        approved?: boolean;
        payloadHash?: string;
        payload?: unknown;
      };
      if (body.approved === undefined) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const payloadHash =
        body.payloadHash ??
        (body.payload !== undefined ? hashActionPayload(body.payload) : undefined);
      try {
        const decided = grants.decideApprovalRequest(requestId, {
          approved: body.approved,
          payloadHash,
        });
        sendJson(res, 200, decided);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status =
          message.includes("expired") ||
          message.includes("already decided") ||
          message.includes("materially changed") ||
          message.includes("no longer")
            ? 409
            : message.includes("Unknown")
              ? 404
              : 409;
        sendJson(res, status, { error: "decide_failed", message });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/approvals") {
      const body = (await readJsonBody(req)) as {
        grantId?: string;
        subject?: string;
        resource?: string;
        action?: string;
        payloadHash?: string;
        payload?: unknown;
        approved?: boolean;
      };
      const payloadHash =
        body.payloadHash ??
        (body.payload !== undefined ? hashActionPayload(body.payload) : undefined);
      if (
        !body.grantId ||
        !body.subject ||
        !body.resource ||
        !body.action ||
        payloadHash === undefined ||
        body.approved === undefined ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const approval = grants.recordApproval({
          grantId: body.grantId,
          subject: body.subject,
          resource: body.resource,
          action: body.action,
          payloadHash,
          approved: body.approved,
        });
        sendJson(res, 201, { approval });
      } catch (err) {
        sendJson(res, 409, {
          error: "approval_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const connectionRotateMatch = path.match(
      /^\/v1\/connections\/([A-Za-z0-9_-]{8,128})\/rotate$/,
    );
    if (req.method === "POST" && connectionRotateMatch) {
      const connectionId = connectionRotateMatch[1]!;
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        accessToken?: string;
      };
      const workspaceId =
        body.workspaceId ?? url.searchParams.get("workspaceId") ?? undefined;
      if (
        !workspaceId ||
        !body.accessToken ||
        !isWorkspaceId(workspaceId)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        if (connections.getGithubConnection(connectionId, workspaceId)) {
          const connection = connections.rotateGithubCredential(
            connectionId,
            workspaceId,
            body.accessToken,
          );
          sendJson(res, 200, {
            connection: publicGithubConnection(connection),
          });
          return;
        }
        if (connections.getMcpConnection(connectionId, workspaceId)) {
          const connection = connections.rotateMcpCredential(
            connectionId,
            workspaceId,
            body.accessToken,
          );
          sendJson(res, 200, {
            connection: publicMcpConnection(connection),
          });
          return;
        }
        sendJson(res, 404, { error: "connection_not_found" });
      } catch (err) {
        sendJson(res, 409, {
          error: "rotate_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const connectionRevokeMatch = path.match(
      /^\/v1\/connections\/([A-Za-z0-9_-]{8,128})\/revoke$/,
    );
    if (req.method === "POST" && connectionRevokeMatch) {
      const connectionId = connectionRevokeMatch[1]!;
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
      };
      const workspaceId =
        body.workspaceId ?? url.searchParams.get("workspaceId") ?? undefined;
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        if (connections.getGithubConnection(connectionId, workspaceId)) {
          const connection = connections.revokeGithubConnection(
            connectionId,
            workspaceId,
          );
          sendJson(res, 200, {
            connection: publicGithubConnection(connection),
            revoked: true,
          });
          return;
        }
        if (connections.getMcpConnection(connectionId, workspaceId)) {
          const connection = connections.revokeMcpConnection(
            connectionId,
            workspaceId,
          );
          sendJson(res, 200, {
            connection: publicMcpConnection(connection),
            revoked: true,
          });
          return;
        }
        sendJson(res, 404, { error: "connection_not_found" });
      } catch (err) {
        sendJson(res, 409, {
          error: "revoke_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/authorization/execute") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        subject?: string;
        resource?: string;
        action?: string;
        at?: string;
        payloadHash?: string;
        payload?: unknown;
        approvalId?: string;
      };
      const payloadHash =
        body.payloadHash ??
        (body.payload !== undefined ? hashActionPayload(body.payload) : undefined);
      if (
        !body.workspaceId ||
        !body.subject ||
        !body.resource ||
        !body.action ||
        payloadHash === undefined ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.subject)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const gate = grants.gateProtectedAction(
          {
            workspaceId: body.workspaceId,
            subject: body.subject,
            resource: body.resource,
            action: body.action,
            at: body.at,
          },
          { payloadHash },
          body.approvalId,
        );
        const status = gate.allowed ? 200 : 403;
        sendJson(res, status, { gate });
      } catch (err) {
        sendJson(res, 403, {
          error: "tenant_boundary",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const workspaceGithubConnectMatch = path.match(
      /^\/v1\/workspaces\/(ws_[A-Za-z0-9_-]+)\/connections\/github$/,
    );
    if (req.method === "POST" && workspaceGithubConnectMatch) {
      const workspaceIdRaw = workspaceGithubConnectMatch[1];
      if (!workspaceIdRaw || !isWorkspaceId(workspaceIdRaw)) {
        sendJson(res, 400, { error: "invalid_workspace" });
        return;
      }
      const workspaceId = workspaceIdRaw;
      const body = (await readJsonBody(req)) as {
        installationId?: string;
        accessToken?: string;
      };
      if (!body.installationId || !body.accessToken) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      if (!connections.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      try {
        const connection = connections.connectGithub({
          workspaceId,
          installationId: body.installationId,
          accessToken: body.accessToken,
        });
        sendJson(res, 201, {
          connection: publicGithubConnection(connection),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes("already exists") ? 409 : 400;
        sendJson(res, status, { error: "connect_failed", message });
      }
      return;
    }

    const workspaceConnectionsMatch = path.match(
      /^\/v1\/workspaces\/(ws_[A-Za-z0-9_-]+)\/connections$/,
    );
    if (req.method === "GET" && workspaceConnectionsMatch) {
      const workspaceIdRaw = workspaceConnectionsMatch[1];
      if (!workspaceIdRaw || !isWorkspaceId(workspaceIdRaw)) {
        sendJson(res, 400, { error: "invalid_workspace" });
        return;
      }
      const workspaceId = workspaceIdRaw as WorkspaceId;
      if (!connections.workspace.getWorkspace(workspaceId)) {
        sendJson(res, 404, { error: "workspace_not_found" });
        return;
      }
      const rows = connections.listGithubConnections(workspaceId);
      sendJson(res, 200, {
        connections: rows.map(publicGithubConnection),
      });
      return;
    }

    if (req.method === "POST" && path === "/v1/github/actions/execute") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        connectionId?: string;
        subject?: string;
        repo?: string;
        action?: string;
        at?: string;
        payloadHash?: string;
        payload?: unknown;
        approvalId?: string;
        signalId?: string;
        recordReceipt?: boolean;
        idempotencyKey?: string;
      };
      const payloadHash =
        body.payloadHash ??
        (body.payload !== undefined ? hashActionPayload(body.payload) : undefined);
      if (
        !body.workspaceId ||
        !body.connectionId ||
        !body.subject ||
        !body.repo ||
        !body.action ||
        payloadHash === undefined ||
        !isWorkspaceId(body.workspaceId) ||
        !isActorAddress(body.subject) ||
        !GITHUB_ACTIONS.has(body.action)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      if (body.signalId) {
        const linked = signals.getSignal(body.signalId);
        if (!linked || linked.workspaceId !== body.workspaceId) {
          sendJson(res, 400, { error: "invalid_signal_link" });
          return;
        }
      }
      const connection = connections.getGithubConnection(
        body.connectionId,
        body.workspaceId,
      );
      if (!connection) {
        sendJson(res, 404, { error: "connection_not_found" });
        return;
      }
      const resource = githubResource(body.repo);
      const action = body.action as GithubProtectedAction;
      const retryGate = executions.assertBlindRetryAllowed({
        workspaceId: body.workspaceId,
        subject: body.subject,
        resource,
        action,
        payloadHash,
        connectionId: body.connectionId,
        idempotencyKey: body.idempotencyKey,
      });
      if (!retryGate.allowed) {
        sendJson(res, 409, {
          error: retryGate.reason,
          priorExecution: {
            executionId: retryGate.prior.executionId,
            state: retryGate.prior.state,
            idempotencyKey: retryGate.prior.idempotencyKey,
          },
        });
        return;
      }
      const tracked = executions.start({
        workspaceId: body.workspaceId,
        subject: body.subject,
        resource,
        action,
        payloadHash,
        signalId: body.signalId,
        connectionId: body.connectionId,
        idempotencyKey: body.idempotencyKey,
      });
      try {
        const gate = grants.gateProtectedAction(
          {
            workspaceId: body.workspaceId,
            subject: body.subject,
            resource,
            action,
            at: body.at,
          },
          { payloadHash },
          body.approvalId,
        );
        if (!gate.allowed) {
          const terminalState =
            gate.reason === "approval_required"
              ? "awaiting_approval"
              : "rejected";
          executions.setState(tracked.executionId, terminalState, {
            note: gate.reason,
          });
          let receipt;
          if (body.signalId && (body.recordReceipt ?? true)) {
            try {
              receipt = receipts.recordReceipt({
                workspaceId: body.workspaceId,
                signalId: body.signalId,
                sender: body.subject,
                verificationOk: true,
                decision: gate.decision,
                approvalId: body.approvalId,
                execution: executionOutcomeFromGate(gate),
              });
            } catch {
              /* receipt may already exist on retry */
            }
          }
          sendJson(res, 403, {
            gate,
            receipt,
            executionState: executions.get(tracked.executionId),
          });
          return;
        }
        executions.setState(tracked.executionId, "authorized");
        executions.setState(tracked.executionId, "running");
        const token = connections.resolveCredential(connection.credentialRef);
        let execution: {
          ok: boolean;
          externalRef?: string;
          error?: string;
        };
        try {
          execution = await executeGithubAction(
            {
              subject: body.subject,
              connectionId: body.connectionId,
              repo: body.repo,
              action,
              payload:
                body.payload && typeof body.payload === "object"
                  ? (body.payload as Record<string, unknown>)
                  : undefined,
            },
            true,
            { token, http: githubHttp },
          );
        } catch (execErr) {
          const message =
            execErr instanceof Error ? execErr.message : String(execErr);
          const ambiguous =
            /timeout|aborted|abort|ETIMEDOUT|ECONNRESET|network|fetch failed/i.test(
              message,
            );
          execution = {
            ok: false,
            error: ambiguous
              ? /timeout|ETIMEDOUT/i.test(message)
                ? "timeout"
                : /abort/i.test(message)
                  ? "aborted"
                  : "network_error"
              : message,
          };
        }
        const outcome = executionOutcomeFromGithub(execution);
        if (outcome.status === "succeeded") {
          executions.setState(tracked.executionId, "succeeded", {
            note: outcome.externalRef,
          });
        } else if (outcome.status === "unknown") {
          executions.setState(tracked.executionId, "outcome_unknown", {
            note: outcome.note,
          });
        } else if (outcome.status === "denied") {
          executions.setState(tracked.executionId, "rejected", {
            note: outcome.reason,
          });
        } else {
          executions.setState(tracked.executionId, "failed", {
            note: outcome.error,
          });
        }
        const status =
          execution.ok
            ? 200
            : outcome.status === "unknown"
              ? 504
              : 502;
        let receipt;
        if (body.signalId && (body.recordReceipt ?? true)) {
          try {
            receipt = receipts.recordReceipt({
              workspaceId: body.workspaceId,
              signalId: body.signalId,
              sender: body.subject,
              verificationOk: true,
              decision: gate.decision,
              approvalId: body.approvalId,
              execution: outcome,
            });
          } catch {
            /* ignore duplicate receipt */
          }
        }
        sendJson(res, status, {
          gate,
          execution,
          receipt,
          executionState: executions.get(tracked.executionId),
        });
      } catch (err) {
        executions.setState(tracked.executionId, "failed", {
          note: err instanceof Error ? err.message : String(err),
        });
        sendJson(res, 403, {
          error: "tenant_boundary",
          message: err instanceof Error ? err.message : String(err),
          executionState: executions.get(tracked.executionId),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/verify") {
      const body = (await readJsonBody(req)) as {
        address?: string;
        keyId?: string;
        message?: string;
        signature?: string;
      };
      if (
        !body.address ||
        !body.keyId ||
        body.message === undefined ||
        !body.signature ||
        !isActorAddress(body.address)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      const result = registry.verifySignature({
        address: body.address,
        keyId: body.keyId,
        message: body.message,
        signature: body.signature,
      });
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "not_found" });
  });
}
