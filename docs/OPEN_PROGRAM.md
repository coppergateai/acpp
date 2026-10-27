# OPEN_PROGRAM — ACPP

> **Status:** Spendable backlog for Coppergate Arena dogfood (`architectureRepo=coppergateai/acpp`)  
> **Format:** rows must stay `| Open | ID | … |` until shipped, then `| Done | ID | … |`  
> **Pilot rules:** thin BYOK spend; N=1; no paid pricing CTAs; deploy human-gated.  
> **Parser IDs:** `(P|W|A|S|AG|RT|SEC)-\d{2,4}`  
> **Pick order:** first **Open** row in this file is next spend (keep dependency order).

Agents invent only from **Open** rows below — not from `PRODUCT.md`.

Use with:

```bash
ARCHITECTURE_REPO=coppergateai/acpp
ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md
```

## Phase 1 — MVP (spend next)

| Status | ID | Title | Notes |
| --- | --- | --- | --- |
| Open | P-010 | Actor registry + stable address + Ed25519 key lifecycle | Register, verify, rotate, suspend — `@acpp/identity` + db |
| Open | S-010 | Authenticated signal send/receive + replay/idempotency | Persist Signal + SignalDelivery; reject replay |
| Open | SEC-010 | PermissionGrant + expire + revoke + approval-bound action | Wire `@acpp/policy` into API; approval binding |
| Open | P-020 | GitHub connection once + per-agent scope + one protected op | Real HTTP; credential isolation |
| Open | P-030 | Receipt chain + dashboard inspector + revoke-then-deny proof | UI nav stubbed in `@acpp/web` |
| Open | A-010 | HTTP API + SDK stub + wedge-github quickstart polish | Expand beyond health; publish example walkthrough |
| Open | AG-001 | CI check name honesty for Coppergate auto-accept | Job name `check` must match `CI_REQUIRED_CHECK_NAMES` |

## Phase 0 — shipped with scaffold

| Status | ID | Title | Notes |
| --- | --- | --- | --- |
| Done | W-001 | Repo scaffold: pnpm monorepo, CI, LICENSE, README | `docs/ship-receipts/W-001.md` |
| Done | A-001 | PRODUCT.md + WEDGE + dogfood + protocol stubs | Phase 0 docs |
| Done | S-001 | Signal envelope + signing/canonicalization spec | `docs/protocol/signal.md` |
| Done | SEC-001 | Identity + authz + threat model spec | protocol identity/authz/threat-model |
| Done | P-001 | Wedge acceptance checklist | `docs/WEDGE.md` + wedge-github sketch |
