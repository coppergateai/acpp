# ACPP Workspace & ownership (P-011)

## Workspace

A **workspace** is the tenant boundary for ACPP hosted data: identities, connections, signals, grants, and receipts. Every tenant-owned record is scoped to exactly one workspace.

Logical fields:

- `workspaceId` — stable id (`ws_…`)
- `slug` — human-chosen URL-safe name
- `displayName` — label for dashboards

## Actor types (PRODUCT §6.1)

| Type | Role |
| --- | --- |
| **Human** | Owns identities, approves actions, may control agents |
| **Agent** | Autonomous/semi-autonomous actor within policy scope |
| **Service** | Non-agent software emitting events or capabilities |
| **Organization** | Owns policies and delegation within a workspace |
| **Application** | Client using ACPP (OAuth-style consumer; same address scheme) |

Stable addresses use `@acpp/core` (`acpp:human:…`, `acpp:agent:…`, etc.). Handles such as `@research-agent` are not security identities.

## OwnershipRelationship

Ownership edges describe **control and membership**, not permission to call protected APIs:

- `workspace_member` — actor belongs to the workspace
- `controls` — owner administers subject identity lifecycle (e.g. human → agent)
- `organizational_member` — subject is tied to an organization actor

Implementations store these in `@acpp/db` (`WorkspaceStore`). They must **not** auto-create `PermissionGrant` rows.

## Identity ≠ authority

Three independent claims:

1. **Identity** — who signed or owns an address (keys, registration).
2. **Ownership** — who controls or belongs to whom inside a workspace.
3. **Authorization** — explicit grants evaluated by `@acpp/policy`.

A workspace owner or controller with no matching grant is denied on protected operations (deny-by-default). See `identity.md` and `authz.md`.

## API / persistence status

- **Now:** typed model + in-memory `WorkspaceStore` with tenant isolation tests.
- **Next (P-010 / S-010):** PostgreSQL schema and HTTP registration APIs.
