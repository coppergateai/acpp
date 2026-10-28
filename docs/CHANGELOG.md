# Changelog

All notable user-visible changes to the ACPP monorepo.

## Unreleased

### Added

- **SEC-011** — Deny-by-default authorization with required `workspaceId` on evaluate/execute/list/revoke, tenant-scoped grant evaluation in `GrantStore`, self-grant prevention via `grantedBy`, and cross-tenant isolation tests on `@acpp/db` and `@acpp/api`. See [`docs/protocol/authz.md`](./protocol/authz.md).
- **SEC-010** — `PermissionGrant` create/list/revoke with expiration, deterministic `POST /v1/authorization/evaluate`, approval-bound `POST /v1/authorization/execute` via `gateProtectedAction` in `@acpp/policy`, in-memory `GrantStore` in `@acpp/db`, and grant HTTP routes on `@acpp/api`. See [`docs/protocol/authz.md`](./protocol/authz.md).
- **S-011** — MVP signal category catalog and correlation rules (`response` / `approval` require `correlationId`; optional `causationId` must reference a delivered signal), delivery acknowledgement fields (`ackState`, `executionState` always `not_started` at gateway — delivery ≠ execution), correlation index on `SignalStore`, and `GET /v1/signals?correlationId=`. See [`docs/protocol/signal.md`](./protocol/signal.md).
- **S-010** — Authenticated signal send/receive with frozen canonical Ed25519 signing in `@acpp/signals`, in-memory `Signal` + `SignalDelivery` persistence and replay rejection in `@acpp/db`, and `POST/GET /v1/signals` on `@acpp/api`. See [`docs/protocol/signal.md`](./protocol/signal.md).
- **P-010** — Actor registry with stable `acpp:agent:…` addresses, Ed25519 enroll/verify/rotate/suspend/revoke in `@acpp/identity` + `IdentityRegistry` in `@acpp/db`, and identity HTTP routes on `@acpp/api`. See [`docs/protocol/identity.md`](./protocol/identity.md).
- **P-011** — Workspace tenant model, PRODUCT §6.1 actor types, and `OwnershipRelationship` edges in `@acpp/db`, with tenant isolation and ownership-is-not-authorization tests. See [`docs/protocol/workspace.md`](./protocol/workspace.md).
