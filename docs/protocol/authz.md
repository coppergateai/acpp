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
