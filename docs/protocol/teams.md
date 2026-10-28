# Organization teams & roles (P-070)

Phase 2 introduces **organization-scoped teams** inside a workspace so multiple humans can operate shared connections and delegate grants without treating ownership as authorization (PRODUCT §22 / §11.3).

## Community surface

Team roles ship on the **Community / self-host $0** surface. There is no paid-tier upsell UI for these capabilities (see `AGENTS.md` pricing lock).

## Model

| Entity | Purpose |
| --- | --- |
| **Team** | Named group bound to an `organization` actor in the workspace |
| **TeamMembership** | Human member + role: `admin`, `grant_manager`, or `member` |
| **Shared connection** | Workspace-wide GitHub connection with `sharing: "workspace"`, optional `ownerOrganization`, and `connectedBy` audit field |

Roles:

- **admin** — register shared tool connections for the team’s organization
- **grant_manager** — create `PermissionGrant` rows for agents with `organizational_member` ownership to that organization
- **member** — participate in the workspace; cannot manage shared connections or team grants

When **no teams** exist in a workspace, behavior matches Phase 1: any human may connect GitHub once and issue grants (backward compatible).

When **teams exist**, connecting GitHub requires `connectedBy` with **admin** on a team, plus `ownerOrganization` matching a team organization. Grants to organizational agents require **grant_manager** (or **admin**) on the matching team.

## HTTP API (`@acpp/api`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/teams` | Create team (`slug`, `displayName`, `organizationAddress`) |
| `GET` | `/v1/workspaces/{workspaceId}/teams` | List teams |
| `POST` | `/v1/workspaces/{workspaceId}/teams/{teamId}/members` | Add human member (`member`, `role`) |
| `GET` | `/v1/workspaces/{workspaceId}/teams/{teamId}/members` | List members |

Shared GitHub connect (`POST …/connections/github`) accepts `connectedBy` (required) and `ownerOrganization` (required when teams are configured). See [`connections.md`](./connections.md).

## Invariants

- Team roles gate **administration** only; they never create implicit grants (PRODUCT §14.2).
- Agents still require explicit grants for protected GitHub execution.
- Organizational membership uses existing `OwnershipRelationship` kind `organizational_member` (`workspace.md`).

Persistence: `@acpp/db` `TeamStore`, integrated with `ConnectionStore` and `GrantStore`.
