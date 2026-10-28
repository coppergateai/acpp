# MCP integration path (P-022)

**Open ID:** P-022 — PRODUCT §10 / §13.2 Connectivity  
**Status:** Documented gateway sketch + security boundary (Phase 1). Not an MCP marketplace.

ACPP complements [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) tooling. MCP describes how tools are invoked; ACPP supplies **identity**, **authorization**, **credential isolation**, and **receipts** around those invocations. ACPP is not a replacement for MCP and does not host a public connector catalog.

## What ships in Phase 1

| Layer | Phase 1 | Notes |
| --- | --- | --- |
| GitHub connector | **Implemented** | [`connections.md`](./connections.md) — reference gateway pattern |
| MCP gateway HTTP | **Live** | `GET /v1/mcp/capabilities` (P-040); `POST …/connections/mcp` + `POST /v1/mcp/tools/invoke` (P-050) |
| MCP gateway logic | **`@acpp/mcp`** + **`@acpp/discovery`** | Pipeline, SSRF/allowlist helpers, permitted-tool discovery |
| Coppergate bridge | **Consumer** | Coppergate `@coppergate/mcp-client` proxies via `ACPP_GATEWAY_URL` when set |
| MCP host adapter (Claude / Cursor) | **Live — A-030** | `@acpp/mcp-host` stdio MCP server; see [`mcp-host.md`](./mcp-host.md) |

## Architecture sketch

```text
 Agent (acpp:agent:…)
        │
        │ signed identity + tool invoke request
        ▼
┌───────────────────────────────────────┐
│  ACPP hosted gateway (Layer 6 Action) │
│  1 authenticate_actor                 │
│  2 resolve_connection                 │
│  3 check_authorization  ◄── GrantStore│
│  4 validate_tool_and_args             │
│  5 rate limits + approval             │
│  6 execute_via_connection ───────┐    │
│  7 record_request_and_outcome    │    │
│  8 return_sanitized_result ◄─────┘    │
└───────────────────────────────────────┘
        │ credential ref resolved server-side only
        ▼
   Remote MCP server (HTTPS, allowlisted tools)
```

The agent identity is always separate from the connected account’s credentials (PRODUCT §10.5). Agents never receive raw connection secrets.

## HTTP routes (sketch)

These paths are documented in `GET /v1/openapi.json`. **`GET /v1/mcp/capabilities`**, **connect**, and **invoke** are live (P-040 / P-050). GitHub remains the primary wedge connector; MCP is the second hardened path for Coppergate bridge consumers.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/connections/mcp` | Register one MCP server per workspace pattern (URL, allowlisted tools, credential ref) |
| `GET` | `/v1/mcp/capabilities` | Return **permitted** tools for the authenticated actor (PRODUCT §10.4 — discovery ≠ consent) |
| `POST` | `/v1/mcp/tools/invoke` | Policy-gated MCP `tools/call` after grants + optional approval |

### Invoke body (sketch)

```json
{
  "workspaceId": "ws_…",
  "connectionId": "conn_…",
  "subject": "acpp:agent:…",
  "toolName": "search_docs",
  "arguments": { "query": "incident runbook" },
  "approvalId": "optional when grant requires approval"
}
```

Resource id for grants: `mcp:connection:{connectionId}:tool:{toolName}` (see `@acpp/mcp` `mcpResource()`).

Flow mirrors GitHub: `gateProtectedAction` → resolve credential by ref → outbound MCP call → receipt with execution outcome.

## Security boundary (PRODUCT §10.6)

| Control | Behavior |
| --- | --- |
| Tenant isolation | Workspace-scoped connections and grants (same as GitHub wedge) |
| Credential isolation | `credentialRef` only in operator APIs; resolved at step 6 |
| Least privilege | Per-connection tool allowlist + per-agent grants |
| SSRF | Reject private IPs, link-local, and metadata hosts at registration (`assertSafeMcpServerEndpoint`) |
| Transport | HTTPS required for remote servers; localhost only in explicit dev mode |
| Confused deputy | Do not trust a server because it is registered — validate URL, scope, and tool args |
| Discovery | `filterPermittedMcpTools` — never expose hidden tools via metadata |
| Result hygiene | Strip credential-like fields before returning to agents (`sanitizeMcpToolResult`) |
| Audit | Receipt links subject, decision, tool, and outcome (extend P-030 chain) |

See also [`threat-model.md`](./threat-model.md).

## Reference library

```typescript
import {
  MCP_GATEWAY_PIPELINE,
  evaluateMcpGatewayPrecheck,
  assertSafeMcpServerEndpoint,
  mcpResource,
} from "@acpp/mcp";
```

`evaluateMcpGatewayPrecheck` encodes steps 1–5 as deterministic booleans for tests and future API handlers.

## Explicit non-goals

- MCP **marketplace** or public connector store (PRODUCT §13.3)
- OAuth or MCP protocol replacement
- Auto-approval of protected tools from LLM convenience helpers
- Shipping every possible MCP connector in Phase 1
- Becoming a Cursor or Claude product (hosts remain third-party; ACPP is the installable server)

## Host adapter (A-030)

**Shipped** in `@acpp/mcp-host`. Claude Desktop and Cursor add ACPP via `mcp.json` (stdio). Host-initiated `tools/call` reuses the live gateway path (authenticate → grant → optional approval → execute → sanitize). See [`mcp-host.md`](./mcp-host.md).
