# Wedge: GitHub (A-010)

Published walkthrough for the locked ACPP wedge ([`docs/WEDGE.md`](../../docs/WEDGE.md)):

**Register an agent → connect GitHub once → authorize → signal → receipt → revoke → deny.**

## Live HTTP demo (recommended)

Runs against `@acpp/api` (ephemeral in-process server with stub GitHub, or your local API):

```bash
pnpm --filter @acpp/example-wedge-github demo
```

Against a running API:

```bash
pnpm --filter @acpp/api dev   # :8787
ACPP_API_URL=http://127.0.0.1:8787 pnpm --filter @acpp/example-wedge-github demo
```

Expected JSON ends with `"ok": true`, `"allowed": true`, `"denied": true`.

Then open the dashboard receipt inspector:

```bash
pnpm --filter @acpp/web dev
# → http://127.0.0.1:3000/receipts
```

## Full step-by-step HTTP

Same invariants, explicit public routes — use the A-012 quickstart:

- [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md)
- [`docs/wedge-github.md`](../../docs/wedge-github.md) (this example’s published walkthrough)
- `pnpm demo:allow-deny-explicit` / `pnpm quickstart`

## In-process sketch (offline unit test)

`src/demo.ts` keeps a pure in-memory sketch (no HTTP) for fast unit tests:

```bash
pnpm --filter @acpp/example-wedge-github test
```

Real GitHub HTTP + connect/execute API: **P-020** — [`docs/protocol/connections.md`](../../docs/protocol/connections.md).
