# ACPP

**Give agents an identity, not just an API key.**

Agent Communication per Protocol — identity, trust, signaling, and authorization infrastructure for AI agents.

- **Domain:** [acpp.ai](https://acpp.ai) (planned)
- **Spec vision:** [`PRODUCT.md`](./PRODUCT.md)
- **Spendable backlog:** [`docs/OPEN_PROGRAM.md`](./docs/OPEN_PROGRAM.md)
- **Wedge:** [`docs/WEDGE.md`](./docs/WEDGE.md)

## What this is

ACPP is an identity and authorization layer for agents: verifiable identities, structured signals, deterministic policy, receipts, and connectivity (first connector: GitHub).

It is **not** a chatbot, MCP marketplace, or agent orchestration platform.

## Status

Phase 0 / early Phase 1 scaffold. Community / self-host / open protocol first. No paid hosted pricing UI until an explicit product decision.

## Monorepo

```text
packages/
  acpp-core/       # envelopes, IDs, schemas
  acpp-identity/   # actors, keys, verification
  acpp-policy/     # grants, deny, approval bind
  acpp-receipts/   # signal → decision → execution chain
  acpp-github/     # first connector
  db/              # persistence (Drizzle)
apps/
  api/             # Developer HTTP API
  web/             # landing page (/) + receipt dashboard
examples/
  wedge-github/    # end-to-end quickstart
```

## Quick start

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm typecheck
pnpm test
```

Local site + API:

```bash
pnpm --filter @acpp/api dev   # :8787
pnpm --filter @acpp/web dev   # :3000 — landing at /, receipts at /receipts
```

Requires Node.js **22+**.

## Dogfood (Coppergate Arena)

Coppergate develops this repo under Open Program Runtime. See [`docs/ACPP_DOGFOOD.md`](./docs/ACPP_DOGFOOD.md).

```bash
ARCHITECTURE_REPO=coppergateai/acpp
ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md
```

## License

MIT
