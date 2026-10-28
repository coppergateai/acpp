export type McpHttpClient = {
  fetch: typeof fetch;
};

export type McpToolCallResult = {
  ok: boolean;
  result?: Record<string, unknown>;
  externalRef?: string;
  error?: string;
  status?: number;
};

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: {
    content?: unknown;
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
    [key: string]: unknown;
  };
  error?: { code?: number; message?: string; data?: unknown };
};

function mcpResultToRecord(result: JsonRpcResponse["result"]): Record<string, unknown> {
  if (!result || typeof result !== "object") {
    return { content: result };
  }
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return { ...result.structuredContent, content: result.content };
  }
  return { ...result };
}

/**
 * MCP JSON-RPC `tools/call` over HTTPS (PRODUCT §10.5 step 6).
 * Caller must have already passed policy and connection allowlist checks.
 */
export async function performMcpToolCall(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown> | undefined,
  authToken: string | undefined,
  http: McpHttpClient = { fetch },
): Promise<McpToolCallResult> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (authToken?.trim()) {
    headers.authorization = `Bearer ${authToken}`;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args ?? {},
    },
  });

  let res: Response;
  try {
    res = await http.fetch(serverUrl, { method: "POST", headers, body });
  } catch {
    return { ok: false, error: "mcp_transport_error" };
  }

  if (!res.ok) {
    return { ok: false, error: `mcp_http_${res.status}`, status: res.status };
  }

  let parsed: JsonRpcResponse;
  try {
    parsed = (await res.json()) as JsonRpcResponse;
  } catch {
    return { ok: false, error: "mcp_invalid_json", status: res.status };
  }

  if (parsed.error) {
    return {
      ok: false,
      error: parsed.error.message ?? "mcp_rpc_error",
      status: res.status,
    };
  }

  const record = mcpResultToRecord(parsed.result);
  if (parsed.result?.isError === true) {
    return {
      ok: false,
      error: typeof record.message === "string" ? record.message : "mcp_tool_error",
      result: record,
      status: res.status,
    };
  }

  const externalRef = `mcp:tool:${toolName}`;
  return { ok: true, result: record, externalRef, status: res.status };
}
