# Product evolution log — ACPP

## 2026-10-27 — Cycle 0 (scaffold + Phase 0 specs)

### Discovered

| Problem | Evidence | Class |
|---------|----------|--------|
| Empty public repo `coppergateai/acpp` | GitHub empty repo | Bootstrap |
| PRODUCT.md lived outside product repo | workspace root | Align |
| Risk of conflating Coppergate D13 signals with ACPP protocol | Coppergate `@coppergate/signals` | Clarify |

### Decisions

1. Product + Open Program live in `coppergateai/acpp` (no separate architecture repo yet).
2. First wedge = GitHub connector; Community / no paid UI.
3. Coppergate Arena dogfoods ACPP via Spend License on `docs/OPEN_PROGRAM.md`.

### Implemented

- pnpm monorepo: `@acpp/core|identity|policy|receipts|github|db`, `apps/api|web`, `examples/wedge-github`
- Phase 0 protocol stubs + WEDGE + dogfood docs
- CI workflow job name `check`

### Validation

- `pnpm install && pnpm typecheck && pnpm test && pnpm build`

### Remaining (Open Program)

Phase 1 spend order (see `docs/OPEN_PROGRAM.md`, aligned to PRODUCT.md §13 / §22 Phase 1):

- `P-010` actor registry + keys → `P-011` workspace/ownership
- `S-010` signal persistence + replay → `S-011` categories/acks
- `SEC-010` grants API + approval bind → `SEC-011` deny-by-default/tenants → `SEC-012` approval inbox
- `P-020` real GitHub connector → `P-021` secrets + outcome states
- `P-030` receipt inspector → `P-031` dashboard IA + onboarding
- `A-010` Developer API + quickstart → `A-011` OpenAPI/schemas → `A-012` local deny+allow demos
- `P-022` MCP path docs · `AG-001` CI check name honesty
