# Changelog

All notable user-visible changes to the ACPP monorepo.

## Unreleased

### Added

- **P-050** — Hardened MCP adapter: workspace `POST /v1/workspaces/{id}/connections/mcp`, policy-gated `POST /v1/mcp/tools/invoke` (SSRF + allowlist + sanitize), Coppergate bridge via `ACPP_GATEWAY_URL`. Not an MCP marketplace.
- **Marketing site** — Premium ACPP landing page on `@acpp/web` at `/` (protocol principles, seven-layer status, real `@acpp/sdk` sample, wedge demonstration, integration honesty labels). Dashboard overview moved to `/dashboard`; receipt inspector remains at `/receipts`.
- **A-020** — Reference SDK (`@acpp/sdk`): explicit sign/verify/signal helpers, hosted client for evaluate → approval → execute (no auto-approve convenience), execution proof guardrails, and [`docs/protocol/sdk.md`](./protocol/sdk.md) (PRODUCT §17.2).
- **P-040** — Authorized capability discovery: `@acpp/discovery` (identity resolution + grant-derived capabilities, MCP permitted-tool discovery), `GET /v1/identities/{address}/capabilities`, live `GET /v1/mcp/capabilities`, and [`docs/protocol/discovery.md`](./protocol/discovery.md). Discovery ≠ consent (PRODUCT §5.2 / §10.4).
- **P-022** — Documented MCP integration path: `@acpp/mcp` gateway pipeline + security boundary helpers (SSRF-safe endpoints, permitted-tool discovery, result sanitization), OpenAPI sketch routes (`SKETCHED_MCP_HOSTED_PATHS`), and [`docs/protocol/mcp-integration.md`](./protocol/mcp-integration.md). Not an MCP marketplace; execution adapter deferred to P-050.
- **A-012** — Local dev quickstart with reproducible allow/deny demos: `POST /v1/workspaces`, `@acpp/example-quickstart` (`pnpm quickstart`, `pnpm demo:allow-deny-explicit`), and [`docs/QUICKSTART.md`](./QUICKSTART.md).
- **A-011** — OpenAPI 3.1 hosted API document (`GET /v1/openapi.json`) and portable protocol JSON Schemas (`GET /v1/protocol/schemas`, `GET /v1/protocol/schemas/{schemaId}`) in `@acpp/schemas`, separate from dashboard UI. See [`docs/protocol/schemas.md`](./protocol/schemas.md).
- **P-030** — Receipt chain with `@acpp/receipts` inspector steps, in-memory `ReceiptStore` in `@acpp/db`, receipt HTTP routes and wedge revoke proof on `@acpp/api`, and dashboard receipt inspector with revoke-then-deny UI on `@acpp/web`. See [`docs/protocol/receipts.md`](./protocol/receipts.md).
- **P-020** — GitHub connector: workspace connect-once (`ConnectionStore`), credential isolation via refs, real GitHub HTTP for `repos.metadata.read` and `issues.comment` in `@acpp/github`, and gated `POST /v1/github/actions/execute` plus connection routes on `@acpp/api`. See [`docs/protocol/connections.md`](./protocol/connections.md).
- **SEC-011** — Deny-by-default authorization with required `workspaceId` on evaluate/execute/list/revoke, tenant-scoped grant evaluation in `GrantStore`, self-grant prevention via `grantedBy`, and cross-tenant isolation tests on `@acpp/db` and `@acpp/api`. See [`docs/protocol/authz.md`](./protocol/authz.md).
- **SEC-010** — `PermissionGrant` create/list/revoke with expiration, deterministic `POST /v1/authorization/evaluate`, approval-bound `POST /v1/authorization/execute` via `gateProtectedAction` in `@acpp/policy`, in-memory `GrantStore` in `@acpp/db`, and grant HTTP routes on `@acpp/api`. See [`docs/protocol/authz.md`](./protocol/authz.md).
- **S-011** — MVP signal category catalog and correlation rules (`response` / `approval` require `correlationId`; optional `causationId` must reference a delivered signal), delivery acknowledgement fields (`ackState`, `executionState` always `not_started` at gateway — delivery ≠ execution), correlation index on `SignalStore`, and `GET /v1/signals?correlationId=`. See [`docs/protocol/signal.md`](./protocol/signal.md).
- **S-010** — Authenticated signal send/receive with frozen canonical Ed25519 signing in `@acpp/signals`, in-memory `Signal` + `SignalDelivery` persistence and replay rejection in `@acpp/db`, and `POST/GET /v1/signals` on `@acpp/api`. See [`docs/protocol/signal.md`](./protocol/signal.md).
- **P-010** — Actor registry with stable `acpp:agent:…` addresses, Ed25519 enroll/verify/rotate/suspend/revoke in `@acpp/identity` + `IdentityRegistry` in `@acpp/db`, and identity HTTP routes on `@acpp/api`. See [`docs/protocol/identity.md`](./protocol/identity.md).
- **P-011** — Workspace tenant model, PRODUCT §6.1 actor types, and `OwnershipRelationship` edges in `@acpp/db`, with tenant isolation and ownership-is-not-authorization tests. See [`docs/protocol/workspace.md`](./protocol/workspace.md).
