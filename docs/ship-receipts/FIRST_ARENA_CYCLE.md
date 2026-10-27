# First Arena cycle readiness

| Field | Value |
| --- | --- |
| Date | 2026-10-27 |
| Product repo | `coppergateai/acpp` |
| Architecture bind | `coppergateai/acpp` / `docs/OPEN_PROGRAM.md` |
| Boot script | `coppergate/scripts/dogfood-acpp-boot.mjs` |
| Next Open ID | **P-010** (Actor registry + Ed25519 key lifecycle) |

## Pre-flight (done in scaffold)

- [x] `pnpm assert:open-program` lists Open IDs
- [x] CI job name `check`
- [x] Phase 0 Done: W-001, A-001, S-001, SEC-001, P-001
- [x] Wedge sketch test: allow → revoke → deny

## Operator steps to start the loop

1. Ensure GitHub App on Coppergate workspace includes `coppergateai/acpp`.
2. Create workspace/project `acpp` (or project named `acpp` in an existing workspace).
3. Run boot (from coppergate clone):

```bash
DATABASE_URL=… WORKSPACE_SLUG=acpp PRIMARY_NAME=acpp \
  ARCHITECTURE_REPO=coppergateai/acpp \
  ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md \
  MAINTAINER_BUDGET_MICROS=8000000 \
  pnpm --filter @coppergate/db exec node --import tsx \
    ../../scripts/dogfood-acpp-boot.mjs --start
```

4. Enable maintainer / auto-accept as in Coppergate dogfood (CI check name = `check`).
5. Prove: Open ID `P-010` → PR → CI → Accept → Ship Receipt → Open→Done writeback.

## Bootstrap verification (2026-10-27)

| Check | Result |
| --- | --- |
| `pnpm assert:open-program` | next = **P-010** |
| GitHub CI `check` | green on initial `main` |
| `scripts/dogfood-acpp-boot.mjs` | shipped on `coppergateai/coppergate` |
| Boot against local `.env` | fail-closed: workspace slug `acpp` missing (expected) |

**Operator action required for live cycle:** on hosted Coppergate, create workspace `acpp`, install GitHub App for `coppergateai/acpp`, create project `acpp`, then re-run boot with `--start`. This receipt records that the **factory bind surface** is ready; Accept/writeback happens after that Start.
