# Connections (GitHub wedge)

Workspace-scoped tool connections let operators configure an integration **once** while agents receive **per-identity grants** on shared resources (PRODUCT §10 / Use Case D).

## Model

- **Connection** — metadata visible to workspace operators (`connectionId`, `installationId`, `credentialRef`, timestamps). No raw tokens in API responses or grant records.
- **ConnectionCredentialReference** — opaque server-side ref with `active` / `rotated` / `revoked` metadata; raw tokens resolve only during authorized execution.
- **Resource** — `github:repo:{owner}/{name}` via `@acpp/github` `githubResource()`.
- **Actions (MVP)** — `repos.metadata.read`, `issues.comment`.

## HTTP API (`@acpp/api`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/connections/github` | Connect GitHub once per workspace (`installationId`, `accessToken` body fields) |
| `POST` | `/v1/workspaces/{workspaceId}/connections/github/rotate` | Rotate installation token (`connectionId`, `accessToken`); supersedes prior `credentialRef` |
| `GET` | `/v1/workspaces/{workspaceId}/connections` | List connections (credential refs only) |
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
  "idempotencyKey": "optional; blocks blind retry after outcome_unknown"
}
```

Flow: tenant-scoped grant check (`gateProtectedAction`) → `ExecutionStore` lifecycle (`not_started` → `authorized` → `running` → terminal state) → resolve credential by ref → `@acpp/github` real HTTP to `api.github.com`.

### Execution states (PRODUCT §14.5)

Protected GitHub calls persist an `Execution` record with states including `not_started`, `authorized`, `awaiting_approval`, `running`, `succeeded`, `failed`, `rejected`, `cancelled`, and `outcome_unknown`.

When the downstream response is lost (transport error), the gateway records `outcome_unknown` and returns `504`. Reusing the same `idempotencyKey` after `outcome_unknown` returns `409` with `no_blind_retry` — the system does not automatically repeat potentially non-idempotent side effects.

Receipts map `outcome_unknown` to an `unknown` execution outcome so success is never implied (PRODUCT §14.2 #10).

## Invariants

- Deny-by-default: no matching grant → `403` with gate reason; GitHub is never called.
- Agents never receive connection tokens; only the gateway resolves credentials after authorization.
- One GitHub connection per workspace in Phase 1 (second connect returns `409`).
