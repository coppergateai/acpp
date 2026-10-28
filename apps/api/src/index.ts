import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  ACPP_PROTOCOL_VERSION,
  isActorAddress,
  isSignalReferenceId,
  type ActorAddress,
  type SignalEnvelope,
} from "@acpp/core";
import type { WorkspaceId } from "@acpp/db";
import { GrantStore, IdentityRegistry, SignalStore, isWorkspaceId } from "@acpp/db";
import { hashActionPayload } from "@acpp/policy";

export type ApiServerOptions = {
  registry?: IdentityRegistry;
  signals?: SignalStore;
  grants?: GrantStore;
};

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

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;

    if (path === "/health" || path === "/ready") {
      sendJson(res, 200, { ok: true, protocolVersion: ACPP_PROTOCOL_VERSION });
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
        policyMode?: "automatic" | "approval_required" | "denied";
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
          policyMode: body.policyMode,
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

    if (req.method === "GET" && path === "/v1/approval-requests") {
      const workspaceId = url.searchParams.get("workspaceId");
      const status = url.searchParams.get("status") ?? undefined;
      if (!workspaceId || !isWorkspaceId(workspaceId)) {
        sendJson(res, 400, { error: "missing_or_invalid_workspace" });
        return;
      }
      if (
        status &&
        !["pending", "approved", "denied", "expired", "stale"].includes(status)
      ) {
        sendJson(res, 400, { error: "invalid_status" });
        return;
      }
      try {
        const requests = grants.listApprovalRequests({
          workspaceId,
          status: status as
            | "pending"
            | "approved"
            | "denied"
            | "expired"
            | "stale"
            | undefined,
        });
        sendJson(res, 200, { requests });
      } catch (err) {
        sendJson(res, 400, {
          error: "list_failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (req.method === "POST" && path === "/v1/approval-requests") {
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        subject?: string;
        resource?: string;
        action?: string;
        payloadHash?: string;
        payload?: unknown;
        context?: { reason?: string; risks?: string[] };
        expiresAt?: string;
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
        const request = grants.submitApprovalRequest({
          workspaceId: body.workspaceId,
          subject: body.subject,
          resource: body.resource,
          action: body.action,
          payloadHash,
          context: body.context,
          expiresAt: body.expiresAt,
        });
        sendJson(res, 201, { request });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes("denied by policy") ? 403 : 409;
        sendJson(res, status, { error: "approval_request_failed", message });
      }
      return;
    }

    const decideMatch = path.match(/^\/v1\/approvals\/([A-Za-z0-9_-]+)\/decide$/);
    if (req.method === "POST" && decideMatch) {
      const requestId = decideMatch[1]!;
      const body = (await readJsonBody(req)) as {
        workspaceId?: string;
        approved?: boolean;
      };
      if (
        !body.workspaceId ||
        body.approved === undefined ||
        !isWorkspaceId(body.workspaceId)
      ) {
        sendJson(res, 400, { error: "invalid_body" });
        return;
      }
      try {
        const result = grants.decideApprovalRequest(requestId, {
          workspaceId: body.workspaceId,
          approved: body.approved,
        });
        sendJson(res, 200, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = message.includes("expired")
          ? 410
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
        approvalRequestId?: string;
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
          body.approvalRequestId,
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
