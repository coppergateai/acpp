# ACPP Authorization (Phase 0)

## Principles

1. **Deny by default** — no grant → no protected access (PRODUCT §15.2).
2. Grants are scoped to resource + action; mismatched scope is denied.
3. **Tenant isolation** — evaluation and listing require `workspaceId`; grants never leak across workspaces (PRODUCT §14.2 #8).
4. Expired and revoked grants are rejected.
5. Approval (when required) binds to the exact requested action.
6. Delegation cannot increase authority (MVP: no nested delegation).
7. Client cannot override a server-side denial.
8. An agent cannot grant itself additional privileges (`grantedBy` must not equal `subject`).

## Grant model (MVP)

```ts
{
  grantId: string
  workspaceId: string
  grantedBy: ActorAddress
  subject: ActorAddress
  resource: string      // e.g. github:repo:org/name
  action: string        // e.g. issues.comment
  expiresAt?: string
  revokedAt?: string
  requiresApproval: boolean
}
```

Evaluation is **deterministic** (`@acpp/policy`). No opaque trust score.

## Approval

When `requiresApproval` is true, execution waits for an approver decision bound to the same resource/action/payload hash. Stale requests after material change must not execute.

### Approval inbox (SEC-012)

Pending `ApprovalRequest` rows feed an operator inbox (`pending` → `approved` | `denied` | `expired`). Decide re-checks grant validity and payload hash, then creates an `ApprovalRecord` via the existing `recordApproval` path. Listing and decide mark `expiresAt <= now` as `expired` and reject further decide. Direct `POST /v1/approvals` remains for backward-compatible immediate recording.

## Revocation

Revocation prevents **new** operations under the revoked grant. In-flight work follows explicit product rules (fail-closed preferred).

## HTTP API (SEC-010 / SEC-011 / SEC-012)

Implementation:

- **`@acpp/policy`** — `evaluateGrant`, `gateProtectedAction`, `hashActionPayload`, `ApprovalRequest` / `ApprovalRecord`.
- **`@acpp/db`** — `GrantStore` persists in-memory `PermissionGrant` and approval-inbox rows scoped to a workspace; `TenantAuthzRequest` enforces membership + grant filtering.
- **`@acpp/api`** — grant lifecycle and authorization over HTTP.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/grants?workspaceId=&subject=` | List grants in one workspace (`workspaceId` required) |
| `POST` | `/v1/grants` | Create grant (`grantedBy`, `expiresAt`, `requiresApproval` optional) |
| `POST` | `/v1/grants/{grant_id}/revoke` | Revoke grant in workspace (`workspaceId` in body) |
| `POST` | `/v1/authorization/evaluate` | Tenant-scoped grant match (`workspaceId`, `subject`, `resource`, `action`, optional `at`) |
| `POST` | `/v1/approvals/requests` | Create pending approval inbox request |
| `GET` | `/v1/approvals?workspaceId=&status=` | List approval inbox (`status=pending` for open queue) |
| `POST` | `/v1/approvals/{requestId}/decide` | Approve or deny pending request (`{ approved }`) |
| `POST` | `/v1/approvals` | Record approver decision directly (backward compatible) |
| `POST` | `/v1/authorization/execute` | Tenant-scoped protected execution (403 when denied, approval missing, or payload hash mismatches) |

Evaluation and execution remain **server-side**; clients cannot override a denial. Cross-tenant evaluate/execute returns `403` with `tenant_boundary` when the subject is not a member of the requested workspace.
