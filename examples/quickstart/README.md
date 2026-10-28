# Quickstart — allow and deny demo

Reproducible **PRODUCT §17.1** demo: successful authorized GitHub action, then **policy denial** after grant revoke. Uses stub GitHub HTTP (no real tokens).

## One command

```bash
pnpm --filter @acpp/example-quickstart demo
```

Step-by-step HTTP flow (workspace → identity → signal → evaluate → execute → revoke → deny):

```bash
pnpm --filter @acpp/example-quickstart demo:explicit
```

Against a running API (`pnpm --filter @acpp/api dev`):

```bash
ACPP_API_URL=http://127.0.0.1:8787 pnpm --filter @acpp/example-quickstart demo
```

## Tests

```bash
pnpm --filter @acpp/example-quickstart test
```

See [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md) for local development.
