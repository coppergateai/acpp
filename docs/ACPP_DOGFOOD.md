# ACPP dogfood via Coppergate

Coppergate is the **factory**. This repo is the **product**. Arena spends only on Open IDs in [`OPEN_PROGRAM.md`](./OPEN_PROGRAM.md).

## Bind

| Item | Value |
| --- | --- |
| Primary repo | `coppergateai/acpp` |
| Architecture | `coppergateai/acpp` → `docs/OPEN_PROGRAM.md` |
| Suggested workspace slug | `acpp` (or reuse `coppergate` with a dedicated project) |
| Tournament N | **1** |
| Envelope | thin (e.g. **$8** micros `8000000`) |
| Pricing | Community / self-host **$0** — no paid SKU CTAs |

```bash
export WORKSPACE_SLUG=acpp          # or coppergate
export PRIMARY_NAME=acpp
export ARCHITECTURE_REPO=coppergateai/acpp
export ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md
export MAINTAINER_BUDGET_MICROS=8000000
export CI_REQUIRED_CHECK_NAMES=check
```

Coppergate worker **`CI_REQUIRED_CHECK_NAMES`** must match the GitHub check-run name from [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Canonical value for this repo: **`check`** (see [`docs/ci-required-checks.json`](./ci-required-checks.json)). CI runs `pnpm assert:ci-check-names` so the manifest cannot drift from the workflow.

## Boot (from coppergate monorepo)

```bash
cd coppergate
set -a && source .env && set +a

DATABASE_URL="$DATABASE_URL" \
  WORKSPACE_SLUG="${WORKSPACE_SLUG:-acpp}" \
  PRIMARY_NAME=acpp \
  ARCHITECTURE_REPO=coppergateai/acpp \
  ARCHITECTURE_PATHS=docs/OPEN_PROGRAM.md \
  MAINTAINER_BUDGET_MICROS=8000000 \
  pnpm --filter @coppergate/db exec node --import tsx \
    ../../scripts/dogfood-acpp-boot.mjs
```

Pass `--start` to start the project Arena after bind.

Prerequisites:

1. Create workspace (if needed) and attach GitHub App to **coppergateai** (include `acpp`).
2. Create project whose primary repo is `coppergateai/acpp`.
3. CI job name on this repo is **`check`**; set **`CI_REQUIRED_CHECK_NAMES=check`** on the worker (see [`ci-required-checks.json`](./ci-required-checks.json)).

## Prove checklist

- [ ] Open ID in task title → Spend License allows reserve
- [ ] Survivor PR into `coppergateai/acpp` → CI `check` green
- [ ] Accept → Ship Receipt with Open ID
- [ ] `OPEN_PROGRAM.md` row flips Open → Done (writeback)
- [ ] `spend_without_open_id` = 0
- [ ] Next Open ID is `P-010` (actor registry) after Phase 0 Done rows

## Operator floor

Budget + Open Program lines + Arena Start/Stop. Deploy remains human-gated. Do not invent work from `PRODUCT.md`.
