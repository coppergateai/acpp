import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Hosted HTTP API document version (URL prefix /v1). */
export const ACPP_HOSTED_API_VERSION = "1.0.0" as const;

/** Portable protocol schema bundle version (matches @acpp/core ACPP_PROTOCOL_VERSION). */
export const ACPP_PROTOCOL_SCHEMA_VERSION = "0.1.0" as const;

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export type ProtocolSchemaManifest = {
  protocolVersion: string;
  title: string;
  description: string;
  schemas: Array<{
    id: string;
    file: string;
    summary: string;
  }>;
};

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
};

function readJson<T>(relativePath: string): T {
  const raw = readFileSync(join(packageRoot, relativePath), "utf8");
  return JSON.parse(raw) as T;
}

/** Machine-readable OpenAPI 3.1 document for the hosted ACPP service. */
export function loadHostedOpenApi(): OpenApiDocument {
  return readJson("openapi/acpp-hosted-v1.openapi.json");
}

/** Manifest of portable protocol JSON Schemas (not tied to dashboard UI). */
export function loadProtocolManifest(): ProtocolSchemaManifest {
  return readJson(`protocol/v${ACPP_PROTOCOL_SCHEMA_VERSION}/manifest.json`);
}

/** Load a portable protocol schema by manifest id (e.g. signal-envelope). */
export function loadProtocolSchema(schemaId: string): Record<string, unknown> | null {
  const manifest = loadProtocolManifest();
  const entry = manifest.schemas.find((s) => s.id === schemaId);
  if (!entry) {
    return null;
  }
  return readJson(
    `protocol/v${ACPP_PROTOCOL_SCHEMA_VERSION}/${entry.file}`,
  ) as Record<string, unknown>;
}

/**
 * Paths documented in OpenAPI that the hosted service implements.
 * Used by tests to keep docs and router aligned.
 */
export const DOCUMENTED_HOSTED_PATHS = [
  "/health",
  "/ready",
  "/v1/openapi.json",
  "/v1/protocol/schemas",
  "/v1/protocol/schemas/{schemaId}",
  "/v1/workspaces",
  "/v1/workspaces/{workspaceId}/identities",
  "/v1/identities/{address}",
  "/v1/identities/{address}/capabilities",
  "/v1/identities/{address}/keys/rotate",
  "/v1/identities/{address}/suspend",
  "/v1/signals",
  "/v1/signals/{signalId}",
  "/v1/signals/{signalId}/receipt",
  "/v1/receipts",
  "/v1/receipts/{receiptId}",
  "/v1/grants",
  "/v1/grants/{grantId}/revoke",
  "/v1/authorization/evaluate",
  "/v1/authorization/execute",
  "/v1/approvals",
  "/v1/verify",
  "/v1/workspaces/{workspaceId}/connections/github",
  "/v1/workspaces/{workspaceId}/connections",
  "/v1/github/actions/execute",
  "/v1/workspaces/{workspaceId}/connections/mcp",
  "/v1/mcp/capabilities",
  "/v1/mcp/tools/invoke",
  "/v1/demo/wedge-revoke-proof",
] as const;

/**
 * Reserved for documented-but-not-implemented hosted routes.
 * MCP connect + invoke moved to DOCUMENTED_HOSTED_PATHS in P-050.
 */
export const SKETCHED_MCP_HOSTED_PATHS = [] as const;
