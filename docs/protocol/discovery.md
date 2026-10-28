# Capability discovery (P-040)

**Open ID:** P-040 — PRODUCT §7 Layer 2 (Discovery) / §10.4 (Dynamic tool discovery)  
**Invariant:** **Discovery is not consent** (PRODUCT §5.2). Listing capabilities does not authorize invocation.

Authorized discovery resolves an actor identity and returns **policy-permitted** capabilities only. It never exposes full connector catalogs, hidden MCP tools, or credentials.

## Library

`@acpp/discovery`:

- `discoverIdentityCapabilities` — identity summary + grants-derived capability list
- `discoverMcpToolCapabilities` — MCP tools permitted for a subject on a connection
- `authorizeCapabilityDiscovery` — self-discovery allowed; cross-actor requires `capabilities:read` on `acpp:identity:{target}`

## HTTP API

### Identity + permitted capabilities

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/identities/{address}/capabilities` | Resolve identity and list active grants for the subject |

Query parameters:

| Name | Required | Notes |
| --- | --- | --- |
| `workspaceId` | yes | Tenant scope |
| `requester` | no | Defaults to `{address}` (self-discovery) |
| `subject` | no | Must match `{address}` |

Cross-actor discovery (`requester` ≠ `{address}`) requires a grant:

- **Resource:** `acpp:identity:{address}`
- **Action:** `capabilities:read`
- **Subject:** the requester

Response includes `discoveryIsNotConsent: true` and a short notice.

### MCP tool discovery

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/mcp/capabilities` | Permitted MCP tools for a subject on a connection |

Query: `workspaceId`, `subject`, `connectionId`; optional comma-separated `allowedTools` (connection allowlist).

Only tools with an active grant on resource `mcp:connection:{connectionId}:tool:{toolName}` and action `invoke` (or `tools.call`) are returned. Optional catalog metadata is filtered with `filterPermittedMcpTools` from `@acpp/mcp`.

MCP connection registration and invoke remain sketch routes until P-050; discovery is implemented against grants today.

## Related

- [`identity.md`](./identity.md) — identity is not authority
- [`authz.md`](./authz.md) — deny-by-default grants
- [`mcp-integration.md`](./mcp-integration.md) — MCP gateway sketch
