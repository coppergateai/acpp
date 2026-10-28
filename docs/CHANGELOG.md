# Changelog

All notable user-visible changes to the ACPP monorepo.

## Unreleased

### Added

- **S-010** — Authenticated signal send/receive with frozen canonical Ed25519 signing in `@acpp/signals`, in-memory `Signal` + `SignalDelivery` persistence and replay rejection in `@acpp/db`, and `POST/GET /v1/signals` on `@acpp/api`. See [`docs/protocol/signal.md`](./protocol/signal.md).
- **P-010** — Actor registry with stable `acpp:agent:…` addresses, Ed25519 enroll/verify/rotate/suspend/revoke in `@acpp/identity` + `IdentityRegistry` in `@acpp/db`, and identity HTTP routes on `@acpp/api`. See [`docs/protocol/identity.md`](./protocol/identity.md).
- **P-011** — Workspace tenant model, PRODUCT §6.1 actor types, and `OwnershipRelationship` edges in `@acpp/db`, with tenant isolation and ownership-is-not-authorization tests. See [`docs/protocol/workspace.md`](./protocol/workspace.md).
