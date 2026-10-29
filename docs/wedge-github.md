# GitHub wedge walkthrough (A-010)

**Open ID:** A-010 — PRODUCT §16–17 / [`WEDGE.md`](./WEDGE.md)

This is the published walkthrough for the MVP wedge. API and SDK surface largely shipped via **A-011** (OpenAPI), **A-012** (quickstart demos), and **A-020** (`@acpp/sdk`). This doc ties them to the GitHub example.

## What you prove

1. Create a verifiable agent identity.
2. Connect GitHub once for the workspace (or use the stub demo).
3. Grant a scoped permission.
4. Authenticated signal → policy allow → execute → receipt.
5. Revoke the grant → next attempt denied (403).

## Fastest path

```bash
pnpm install
pnpm --filter @acpp/example-wedge-github demo
```

Starts an ephemeral `@acpp/api` with stub GitHub and calls `POST /v1/demo/wedge-revoke-proof`.

Or reuse the shared quickstart entrypoints:

```bash
pnpm quickstart
pnpm demo:allow-deny-explicit
```

## Against a long-running API

```bash
pnpm --filter @acpp/api dev
ACPP_API_URL=http://127.0.0.1:8787 pnpm --filter @acpp/example-wedge-github demo
```

Optional dashboard (P-031):

```bash
pnpm --filter @acpp/web dev
# /onboarding checklist → /receipts inspector
```

## Docs map

| Doc | Role |
| --- | --- |
| [`QUICKSTART.md`](./QUICKSTART.md) | Local allow/deny demos + PRODUCT §17.1 checklist |
| [`WEDGE.md`](./WEDGE.md) | Locked wedge narrative |
| [`protocol/connections.md`](./protocol/connections.md) | GitHub connect-once + execute |
| [`protocol/sdk.md`](./protocol/sdk.md) | `@acpp/sdk` typed helpers |
| [`examples/wedge-github`](../examples/wedge-github/README.md) | Example package (HTTP demo + offline sketch) |

## Superseded stubs

Early A-010 sketched “HTTP API + SDK stub” only. Hosted routes, OpenAPI, quickstart, and SDK quality are **Done** under A-011 / A-012 / A-020. This Open ID closes by publishing the wedge walkthrough and aligning `examples/wedge-github` with the live API.
