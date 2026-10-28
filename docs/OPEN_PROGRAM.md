# OPEN_PROGRAM — ACPP

> **Status:** Spendable backlog for Coppergate Arena dogfood (`architectureRepo=coppergateai/acpp`)  
> **Source of truth for vision:** [`../PRODUCT.md`](../PRODUCT.md) — agents invent only from **Open** rows below, never from PRODUCT.md  
> **Format:** rows must stay `| Open | ID | … |` until shipped, then `| Done | ID | … |`  
> **Pilot rules:** thin BYOK spend; N=1; Community / self-host **$0** only (no paid SKU CTAs); deploy human-gated  
> **Parser IDs:** `(P|W|A|S|AG|RT|SEC)-\d{2,4}`  
> **Pick order:** first **Open** row in this file is next spend (keep dependency order).  
> **Wedge:** [`WEDGE.md`](./WEDGE.md) — register agent → connect GitHub once → authorize → signal → receipt → revoke → deny

Use with:

```bash
ARCHITECTURE_REPO=coppergateai/acpp
ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md
```

## Phase 1 — MVP (spend next)

Maps to PRODUCT.md **§13 MVP**, **§22 Phase 1**, and **§23 acceptance**. Prove the chain:  
**Signal → Identity Verification → Policy Evaluation → Authorization → Action → Receipt**.

| Status | ID | Title | Notes |
| --- | --- | --- | --- |
| Done | P-010 | Actor registry + stable address + Ed25519 key lifecycle | PRODUCT §6 / §13.2 Identity — register, verify, rotate, suspend; `acpp:agent:…` + `@acpp/identity` + db |
| Done | P-011 | Workspace + ownership + actor types | PRODUCT §6.1 / §14.4 — `@acpp/db` WorkspaceStore; `docs/protocol/workspace.md` |
| Done | S-010 | Authenticated signal send/receive + replay/idempotency | PRODUCT §8 / §13.2 Signals — `@acpp/signals` canonical signing; `SignalStore`; `/v1/signals` |
| Done | S-011 | Signal categories + correlation + delivery acks | PRODUCT §8.1–8.4 — Event/Request/Offer/Response/Approval/Revocation; delivery ≠ execution |
| Done | SEC-010 | PermissionGrant + expire + revoke + approval-bound action | PRODUCT §9 / §13.2 Authorization — wire `@acpp/policy` into API |
| Done | SEC-011 | Deny-by-default + scopes + tenant isolation | PRODUCT §15.2 / §14.2 — no grant → no access; server-side tenant boundaries + tests |
| Open | SEC-012 | Approval inbox + action-binding integrity | PRODUCT §9.4 / §11.6 — Automatic / Approval required / Denied; reject stale or materially changed requests |
| Done | P-020 | GitHub connection once + per-agent scope + one protected op | PRODUCT §10 / §12 Use Case D — real HTTP; credential isolation; issues.comment or repos.metadata.read |
| Open | P-021 | Secret refs + execution outcome states | PRODUCT §10.3 / §14.5 — ConnectionCredentialReference; Not started→…→Outcome unknown; no blind retry |
| Open | P-030 | Receipt chain + dashboard inspector + revoke-then-deny proof | PRODUCT §13.1 #8–9 — signal→decision→outcome; UI proves revoke then deny |
| Open | P-031 | Dashboard IA + onboarding wedge flow | PRODUCT §11.1–11.2 — Overview, Identities, Connections, Signals, Permissions, Receipts, Developers; TTFV steps 1–8 |
| Open | A-010 | HTTP API + SDK stub + wedge-github quickstart polish | PRODUCT §16–17 — expand beyond health; publish walkthrough |
| Done | A-011 | OpenAPI + machine-readable protocol schemas | PRODUCT §13.2 DX / §16 — `@acpp/schemas`, `/v1/openapi.json`, `/v1/protocol/schemas`; `docs/protocol/schemas.md` |
| Done | A-012 | Local dev + reproducible allow and deny demos | PRODUCT §17.1 — runnable quickstart shows success **and** policy denial |
| Done | P-022 | Documented MCP integration path | PRODUCT §10 / §13.2 — `@acpp/mcp`, OpenAPI sketch routes, `docs/protocol/mcp-integration.md`; not a marketplace |
| Done | AG-001 | CI check name honesty for Coppergate auto-accept | Job name `check` must match `CI_REQUIRED_CHECK_NAMES`; manifest [`ci-required-checks.json`](./ci-required-checks.json) + `pnpm assert:ci-check-names` |
| Open | AG-002 | Lockfile sync on dependency edits | Any `package.json` change must refresh `pnpm-lock.yaml`; CI `assert:lockfile` + Coppergate delivery refuse `lockfile_out_of_sync` |

## Phase 2 — Developer platform (later)

Maps to PRODUCT.md **§22 Phase 2**. Do not pull these ahead of Phase 1 Open rows.

| Status | ID | Title | Notes |
| --- | --- | --- | --- |
| Open | P-040 | Capability discovery (authorized) | PRODUCT §7 L2 / §10.4 — resolve identity + permitted capabilities only; discovery ≠ consent |
| Open | SEC-020 | Bounded delegation (no privilege escalation) | PRODUCT §9.3 — delegator≥delegate; no nested escalation; expiration + revoke |
| Open | A-020 | SDK quality pass (sign/verify/signals/authz/receipts) | PRODUCT §17.2 — helpers must not auto-approve protected ops |
| Open | P-050 | Second connector or hardened MCP adapter | PRODUCT §22 Phase 2 — expand beyond GitHub without sprawl |
| Open | P-060 | Audit export for incident investigation | PRODUCT §15.6 / §22 — append-oriented export for authorized roles |
| Open | P-070 | Organization + team roles | PRODUCT §22 — shared connections, team grants; still Community pricing surface |

## Phase 0 — shipped with scaffold

| Status | ID | Title | Notes |
| --- | --- | --- | --- |
| Done | W-001 | Repo scaffold: pnpm monorepo, CI, LICENSE, README | `docs/ship-receipts/W-001.md` |
| Done | A-001 | PRODUCT.md + WEDGE + dogfood + protocol stubs | Phase 0 docs |
| Done | S-001 | Signal envelope + signing/canonicalization spec | `docs/protocol/signal.md` |
| Done | SEC-001 | Identity + authz + threat model spec | protocol identity/authz/threat-model |
| Done | P-001 | Wedge acceptance checklist | `docs/WEDGE.md` + wedge-github sketch |

## Explicitly not Open IDs (PRODUCT §13.3)

Do not invent work for: chat/messaging app, agent marketplace, reputation scores, crypto/token identity, foundation model, OAuth/MCP replacement, multi-agent orchestration product, paid hosted SKU UI, or unbounded cross-agent execution without policy.

## Acceptance (every Open ID)

1. Lands capability in `coppergateai/acpp` with tests or validation.
2. Preserves architectural invariants (PRODUCT §14.2) — especially identity ≠ authorization; deny-by-default; no self-escalation.
3. User-visible changes update docs/CHANGELOG when applicable.
4. PR title names the Open ID and capability (not scaffold/typo).
5. Architecture writeback flips this row to **Done** after merge.
6. Accept produces a Ship Receipt (Open ID, spend, fitness, CI, writeback).
7. Phase 1 is complete only when PRODUCT §13.1 objectives 1–9 and §23 checklists are demonstrably green end-to-end (wedge proof).
