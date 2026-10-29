# Connections (GitHub wedge)

Workspace-scoped tool connections let operators configure an integration **once** while agents receive **per-identity grants** on shared resources (PRODUCT §10 / Use Case D).

## Model

- **Connection** — metadata visible to workspace operators (`connectionId`, `installationId`, `credentialRef`, timestamps). No raw tokens in API responses or grant records.
- **ConnectionCredentialReference** — opaque server-side ref resolved only during authorized execution. Rotate issues a new ref and invalidates the prior vault entry; revoke drops the vault entry and connection mapping (P-021).
- **Execution states** — `ExecutionStore` tracks PRODUCT §14.5 lifecycle (`not_started` → `authorized` → `awaiting_approval` → `running` → terminal). Ambiguous/timeout GitHub responses map to `outcome_unknown`. Non-idempotent `issues.comment` refuses blind retry (`409`) while `running` or `outcome_unknown` unless the same `idempotencyKey` is supplied.
- **Resource** — `github:repo:{owner}/{name}` via `@acpp/github` `githubResource()`.
- **Actions (MVP)** — `repos.metadata.read`, `issues.comment`.

## HTTP API (`@acpp/api`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/connections/github` | Connect GitHub once per workspace (`installationId`, `accessToken` body fields) |
| `GET` | `/v1/workspaces/{workspaceId}/connections` | List connections (credential refs only) |
| `POST` | `/v1/connections/{connectionId}/rotate` | Rotate credential (`workspaceId` + `accessToken` in body) |
| `POST` | `/v1/connections/{connectionId}/revoke` | Revoke connection + vault entry (`workspaceId` in body) |
| `POST` | `/v1/github/actions/execute` | Policy gate + GitHub HTTP for an authorized agent |

### Execute body

```json
{
  "workspaceId": "ws_…",
  "connectionId": "conn_…",
  "subject": "acpp:agent:…",
  "repo": "org/name",
  "action": "repos.metadata.read",
  "payload": {},
  "approvalId": "optional when grant requires approval",
  "idempotencyKey": "optional; required to retry after outcome_unknown on issues.comment"
}
```

Flow: blind-retry check → tenant-scoped grant check (`gateProtectedAction`) → advance execution state → resolve credential by ref → `@acpp/github` real HTTP to `api.github.com` → terminal state + receipt.

## Invariants

- Deny-by-default: no matching grant → `403` with gate reason; GitHub is never called.
- Agents never receive connection tokens; only the gateway resolves credentials after authorization.
- One GitHub connection per workspace in Phase 1 (second connect returns `409`).
- Rotate/revoke never expose raw tokens; revoked connections return `404` on execute.
- No blind retry of non-idempotent actions when outcome is uncertain (PRODUCT §14.5).

## MCP path

GitHub is the first production connector. MCP uses the same connect-once / grant-per-agent / rotate-revoke pattern (`POST /v1/workspaces/{id}/connections/mcp`, rotate/revoke on `/v1/connections/{id}/…`). See [`mcp-integration.md`](./mcp-integration.md).
