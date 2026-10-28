# Receipts (PRODUCT §13.2)

Receipts link an authenticated **signal** to an **authorization decision** and **execution outcome**. They must not claim external success when the outcome is unknown.

## Chain (inspector)

1. **Signal** — request envelope id and type  
2. **Identity verification** — sender signature valid at gateway  
3. **Authorization decision** — allow/deny from policy evaluation  
4. **Execution outcome** — succeeded, failed, denied, or unknown  

Use `describeReceiptChain` from `@acpp/receipts` for ordered inspector steps.

## HTTP API

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/v1/receipts` | Record receipt for an existing signal in a workspace |
| `GET` | `/v1/receipts?workspaceId=` | List receipts for tenant |
| `GET` | `/v1/receipts/{receipt_id}?workspaceId=` | Fetch one receipt |
| `GET` | `/v1/signals/{signal_id}/receipt?workspaceId=` | Receipt for signal |
| `POST` | `/v1/demo/wedge-revoke-proof` | Demo: allow + receipt → revoke → deny + receipt |

`POST /v1/github/actions/execute` accepts optional `signalId` and records a receipt when policy denies or after execution.

## Dashboard

`apps/web` **Receipts** page (`/receipts`) calls the wedge demo and renders the inspector plus revoke-then-deny proof (PRODUCT §13.1 #8–9).

## Invariants

- Receipts are workspace-scoped; cross-tenant reads return not found.
- One receipt per signal id in the in-memory store (retries must not duplicate).
- Denied executions use `execution.status: "denied"` — not succeeded.
