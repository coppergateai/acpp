# Connections (GitHub wedge)

Workspace-scoped tool connections let operators configure an integration **once** while agents receive **per-identity grants** on shared resources (PRODUCT §10 / Use Case D).

## Model

- **Connection** — metadata visible to workspace operators (`connectionId`, `installationId`, `credentialRef`, timestamps). No raw tokens in API responses or grant records.
- **ConnectionCredentialReference** — opaque server-side ref resolved only during authorized execution (P-021 expands rotation and outcome states).
- **Resource** — `github:repo:{owner}/{name}` via `@acpp/github` `githubResource()`.
- **Actions (MVP)** — `repos.metadata.read`, `issues.comment`.

## HTTP API (`@acpp/api`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/connections/github` | Connect GitHub once per workspace (`installationId`, `accessToken` body fields) |
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
  "approvalId": "optional when grant requires approval"
}
```

Flow: tenant-scoped grant check (`gateProtectedAction`) → resolve credential by ref → `@acpp/github` real HTTP to `api.github.com`.

## Invariants

- Deny-by-default: no matching grant → `403` with gate reason; GitHub is never called.
- Agents never receive connection tokens; only the gateway resolves credentials after authorization.
- One GitHub connection per workspace in Phase 1 (second connect returns `409`).
