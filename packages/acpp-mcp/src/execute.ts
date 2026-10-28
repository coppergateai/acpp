import type { McpToolInvokeRequest } from "./gateway.js";
import { isToolOnConnectionAllowlist, sanitizeMcpToolResult } from "./security-boundary.js";
import { performMcpToolCall, type McpHttpClient } from "./http.js";

export type ExecuteMcpToolDeps = {
  serverUrl: string;
  connectionAllowedTools: readonly string[];
  /** Resolved server-side after authorization — never supplied by the calling agent. */
  token?: string;
  http?: McpHttpClient;
};

export type ExecuteMcpToolOutcome = {
  ok: boolean;
  result?: Record<string, unknown>;
  externalRef?: string;
  error?: string;
};

/**
 * Execute a policy-gated MCP tool when authorization and allowlist checks pass.
 */
export async function executeMcpTool(
  req: McpToolInvokeRequest,
  authorized: boolean,
  deps: ExecuteMcpToolDeps,
): Promise<ExecuteMcpToolOutcome> {
  if (!authorized) {
    return { ok: false, error: "unauthorized" };
  }
  if (!isToolOnConnectionAllowlist(deps.connectionAllowedTools, req.toolName)) {
    return { ok: false, error: "tool_not_allowed" };
  }
  if (!deps.token?.trim()) {
    return { ok: false, error: "connection_credential_unavailable" };
  }

  const raw = await performMcpToolCall(
    deps.serverUrl,
    req.toolName,
    req.arguments,
    deps.token,
    deps.http,
  );
  if (!raw.ok || !raw.result) {
    return {
      ok: false,
      error: raw.error ?? "execution_failed",
      externalRef: raw.externalRef,
    };
  }

  return {
    ok: true,
    result: sanitizeMcpToolResult(raw.result),
    externalRef: raw.externalRef,
  };
}
