import { ACPP_PROTOCOL_VERSION } from "@acpp/core";

/** Machine-readable Developer API catalog (A-010). OpenAPI lands in A-011. */
export const DEVELOPER_API_ROUTES = [
  { method: "GET", path: "/health", summary: "Liveness probe" },
  { method: "GET", path: "/ready", summary: "Readiness probe" },
  { method: "GET", path: "/v1", summary: "Developer API catalog" },
  { method: "POST", path: "/v1/workspaces", summary: "Create workspace tenant" },
  { method: "GET", path: "/v1/workspaces/{workspaceId}", summary: "Fetch workspace" },
  {
    method: "POST",
    path: "/v1/workspaces/{workspaceId}/identities",
    summary: "Register actor + first key",
  },
  {
    method: "POST",
    path: "/v1/workspaces/{workspaceId}/connections/github",
    summary: "Connect GitHub once per workspace",
  },
  {
    method: "GET",
    path: "/v1/workspaces/{workspaceId}/connections",
    summary: "List connections (credential refs only)",
  },
  { method: "GET", path: "/v1/identities/{address}", summary: "Identity + public keys" },
  {
    method: "POST",
    path: "/v1/identities/{address}/keys/rotate",
    summary: "Rotate active signing key",
  },
  { method: "POST", path: "/v1/identities/{address}/suspend", summary: "Suspend identity" },
  { method: "POST", path: "/v1/verify", summary: "Verify signature for enrolled key" },
  { method: "POST", path: "/v1/signals", summary: "Submit authenticated signal" },
  { method: "GET", path: "/v1/signals/{signalId}", summary: "Fetch signal + delivery" },
  {
    method: "GET",
    path: "/v1/signals?correlationId=",
    summary: "List signals in correlation thread",
  },
  {
    method: "GET",
    path: "/v1/signals/{signalId}/receipt?workspaceId=",
    summary: "Receipt for signal",
  },
  { method: "GET", path: "/v1/grants?workspaceId=", summary: "List grants in workspace" },
  { method: "POST", path: "/v1/grants", summary: "Create permission grant" },
  { method: "POST", path: "/v1/grants/{grantId}/revoke", summary: "Revoke grant" },
  {
    method: "POST",
    path: "/v1/authorization/evaluate",
    summary: "Evaluate authorization (no execution)",
  },
  { method: "POST", path: "/v1/approvals", summary: "Record approval bound to payload hash" },
  {
    method: "POST",
    path: "/v1/authorization/execute",
    summary: "Gate protected action (403 when denied)",
  },
  {
    method: "POST",
    path: "/v1/github/actions/execute",
    summary: "Policy gate + GitHub HTTP",
  },
  { method: "POST", path: "/v1/receipts", summary: "Record receipt for signal" },
  { method: "GET", path: "/v1/receipts?workspaceId=", summary: "List receipts" },
  {
    method: "GET",
    path: "/v1/receipts/{receiptId}?workspaceId=",
    summary: "Fetch receipt",
  },
  {
    method: "POST",
    path: "/v1/demo/wedge-revoke-proof",
    summary: "Demo: allow → receipt → revoke → deny",
  },
] as const;

export function developerApiCatalog() {
  return {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    documentation: "docs/QUICKSTART.md",
    routes: DEVELOPER_API_ROUTES,
  };
}
