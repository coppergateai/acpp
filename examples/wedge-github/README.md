# Wedge: GitHub

Demonstrates the ACPP MVP loop:

1. **In-process sketch** — identity → grant → GitHub action → receipt → revoke → deny (`demo.ts`).
2. **HTTP walkthrough** — workspace → register agent → signed signal → grant → GitHub execute → revoke → deny via `@acpp/client` (`walkthrough.ts`).

## Run

```bash
pnpm --filter @acpp/example-wedge-github test
```

The HTTP test starts `@acpp/api` in-process with mocked GitHub HTTP (no credentials required).

## Hosted flow

Start the API (`pnpm --filter @acpp/api dev`) and follow [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md).

Protocol details: [`docs/protocol/connections.md`](../../docs/protocol/connections.md), [`docs/WEDGE.md`](../../docs/WEDGE.md).
