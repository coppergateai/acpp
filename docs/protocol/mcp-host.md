# MCP host adapter — Claude / Cursor (A-030)

**Open ID:** A-030 — PRODUCT §10.7  
**Package:** `@acpp/mcp-host`

Install ACPP into Claude Desktop or Cursor as an **MCP server**. Host-initiated tool calls reuse the hosted gateway path: identity → grant → optional approval → execute → sanitized result.

This is not an MCP marketplace and not a Cursor/Claude clone.

## Quick install (Cursor, embedded)

Embedded mode starts an in-process ACPP API, a mock MCP `echo` tool, a demo agent identity, and a scoped grant — then speaks MCP on stdio.

1. From the ACPP monorepo:

```bash
pnpm install
pnpm --filter @acpp/mcp-host build
```

2. Add to Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "acpp": {
      "command": "node",
      "args": [
        "/ABS/PATH/TO/acpp/packages/acpp-mcp-host/dist/cli.js"
      ],
      "env": {
        "ACPP_EMBEDDED": "1"
      }
    }
  }
}
```

3. Reload MCP in Cursor. Try tools:
   - `acpp_whoami`
   - `acpp_list_capabilities`
   - `acpp_evaluate_authorization`
   - `mcp_echo` (policy-permitted mock tool)

## Attach to a running API

```bash
pnpm --filter @acpp/api dev   # :8787
# optional: seed + keep mock alive
pnpm --filter @acpp/mcp-host bootstrap
```

Then set `ACPP_EMBEDDED=0` plus `ACPP_API_URL`, `ACPP_WORKSPACE_ID`, `ACPP_SUBJECT`, `ACPP_MCP_CONNECTION_ID` (and optional `ACPP_GITHUB_CONNECTION_ID`) in the MCP server env.

## Tools

| Tool | Behavior |
| --- | --- |
| `acpp_whoami` | Bound workspace / subject |
| `acpp_list_capabilities` | Grant-derived capabilities only |
| `acpp_evaluate_authorization` | Evaluate resource+action (no side effects) |
| `acpp_mcp_invoke` | Gateway `POST /v1/mcp/tools/invoke` |
| `mcp_*` | One tool per permitted MCP capability |
| `acpp_github_action` | When `ACPP_GITHUB_CONNECTION_ID` is set |

Denied grants return MCP tool errors (fail closed).

## Claude Desktop

Same stdio command in Claude Desktop MCP config (`claude_desktop_config.json` → `mcpServers`).

## Related

- [`mcp-integration.md`](./mcp-integration.md) — gateway HTTP path (P-022 / P-050)
- PRODUCT §10.7 — host adapter requirements
- Open Program **A-030**
