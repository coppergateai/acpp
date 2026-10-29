# Local development quickstart

**Open ID:** A-012 — PRODUCT §17.1

This guide gets you from zero to a **successful authorized action** and a **real policy denial** on your machine. No GitHub token is required; the demo uses an in-memory API and stub GitHub HTTP.

## Prerequisites

- Node.js **22+**
- pnpm **9.15.9** (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Runnable allow / deny demo

One command (starts ephemeral API + runs compact wedge proof):

```bash
pnpm quickstart
```

Or from the example package:

```bash
pnpm --filter @acpp/example-quickstart demo
```

Step-by-step HTTP quickstart (create workspace → register agents → signal → evaluate → execute → revoke → deny):

```bash
pnpm demo:allow-deny-explicit
```

Expected stdout ends with `"ok": true` and `"allowed": true`, `"denied": true`.

## Long-running local API + web

Terminal 1 — API (default port **8787**):

```bash
pnpm --filter @acpp/api dev
```

Terminal 2 — dashboard (optional):

```bash
pnpm --filter @acpp/web dev
```

Run the demo against the running API:

```bash
ACPP_API_URL=http://127.0.0.1:8787 pnpm quickstart
```

For real GitHub calls, set a token when connecting the workspace (`POST /v1/workspaces/{id}/connections/github`). The quickstart demo does **not** need this.

## What the demo proves

1. **Allow** — scoped grant → policy evaluation allows → stub GitHub `issues.comment` succeeds → receipt recorded.
2. **Deny** — grant revoked → evaluation denies → execute returns **403** (deny-by-default).

Compact mode uses `POST /v1/demo/wedge-revoke-proof`. Explicit mode walks the same invariants through public HTTP routes documented in OpenAPI (`GET /v1/openapi.json`).

## PRODUCT §17.1 checklist

| Step | Explicit demo |
| --- | --- |
| Create workspace | `POST /v1/workspaces` |
| Register agent | `POST /v1/workspaces/{id}/identities` |
| Authenticate (sign signals) | Ed25519 via `@acpp/identity` + `@acpp/signals` |
| Send test signal | `POST /v1/signals` |
| Verify signal | `POST /v1/verify` |
| Evaluate permission | `POST /v1/authorization/evaluate` |
| Obtain receipt | auto on gated `POST /v1/github/actions/execute` |
| Policy denial | revoke grant → evaluate denies → execute **403** |

## Reference SDK

For typed helpers (signing, explicit evaluate → approval → execute, receipts), see [`protocol/sdk.md`](./protocol/sdk.md) (`@acpp/sdk`).

## Related docs

- Wedge narrative: [`WEDGE.md`](./WEDGE.md)
- Published GitHub wedge walkthrough: [`wedge-github.md`](./wedge-github.md) (A-010)
- GitHub connector: [`protocol/connections.md`](./protocol/connections.md)
- Authorization: [`protocol/authz.md`](./protocol/authz.md)
- Example package (live HTTP + offline sketch): [`examples/wedge-github`](../examples/wedge-github/README.md)
