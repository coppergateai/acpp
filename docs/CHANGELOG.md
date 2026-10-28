# Changelog

All notable user-visible changes to the ACPP monorepo.

## Unreleased

### Added

- **P-010** — Actor registry with stable `acpp:agent:…` addresses, Ed25519 enroll/verify/rotate/suspend/revoke in `@acpp/identity` + `IdentityRegistry` in `@acpp/db`, and identity HTTP routes on `@acpp/api`. See [`docs/protocol/identity.md`](./protocol/identity.md).
- **P-011** — Workspace tenant model, PRODUCT §6.1 actor types, and `OwnershipRelationship` edges in `@acpp/db`, with tenant isolation and ownership-is-not-authorization tests. See [`docs/protocol/workspace.md`](./protocol/workspace.md).
