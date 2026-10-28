# ACPP Authorization (Phase 0)

## Principles

1. No grant → no protected access.
2. Grants are scoped to resource + action.
3. Expired and revoked grants are rejected.
4. Approval (when required) binds to the exact requested action.
5. Delegation cannot increase authority (MVP: no nested delegation).
6. Client cannot override a server-side denial.
7. An agent cannot grant itself additional privileges.

## Grant model (MVP)

```ts
{
  grantId: string
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

## Revocation

Revocation prevents **new** operations under the revoked grant. In-flight work follows explicit product rules (fail-closed preferred).

## HTTP API (SEC-010)

Implementation:

- **`@acpp/policy`** — `evaluateGrant`, `gateProtectedAction`, `hashActionPayload`.
- **`@acpp/db`** — `GrantStore` persists in-memory `PermissionGrant` rows scoped to a workspace.
- **`@acpp/api`** — grant lifecycle and authorization over HTTP.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/grants?workspaceId=&subject=` | List grants (optional filters) |
| `POST` | `/v1/grants` | Create grant (`expiresAt`, `requiresApproval` optional) |
| `POST` | `/v1/grants/{grant_id}/revoke` | Revoke grant (blocks new evaluations) |
| `POST` | `/v1/authorization/evaluate` | Deterministic grant match (`subject`, `resource`, `action`, optional `at`) |
| `POST` | `/v1/approvals` | Record approver decision bound to `payload` or `payloadHash` |
| `POST` | `/v1/authorization/execute` | Gate protected execution (403 when approval missing or payload hash mismatches) |

Evaluation and execution remain **server-side**; clients cannot override a denial.
