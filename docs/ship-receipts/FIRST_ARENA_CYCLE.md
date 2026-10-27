# First Arena cycle — live bind

| Field | Value |
| --- | --- |
| Date | 2026-10-27 |
| Workspace | `coppergate` (`2c894510-810e-46cc-8ff0-652f63870639`) |
| Project | `acpp` (`f86212ec-24b9-44b7-955d-cda19d833a14`) |
| Arena | `e30265fc-450c-4300-8202-add00dfa1707` RUNNING N=1 |
| Architecture | `coppergateai/acpp` → `docs/OPEN_PROGRAM.md` |
| First Open ID | **P-010** |
| Task | `c85e931a-cae5-477f-a47e-453db2b54506` RUNNING |
| Engineer run | `a2c00435-3f85-4e4f-a03b-a78587acab2c` RUNNING (Cursor BYOK / `cursor_local`) |

## What was done (operator automation)

1. Fly Postgres proxy + App install sync → created project **acpp** on repo `coppergateai/acpp`
2. `dogfood-acpp-boot.mjs --start` — brief approved, $8 envelope, Open IDs parsed (next P-010)
3. Maintainer enabled L2 + architecture bind + path allowlist
4. Forced replan with roadmap markdown (worker had been skipping with empty fetch / `architecture_ids_in_flight` noise)
5. Paused coppergate primary Arena so ACPP could claim worker capacity
6. Worker claimed engineer run with workspace Cursor BYOK + git clone

## Ops scripts (coppergate repo)

- `scripts/dogfood-acpp-boot.mjs`
- `packages/db/scripts/dogfood-acpp-link-install.ts`
- `packages/db/scripts/dogfood-acpp-pin.ts`
- `packages/db/scripts/dogfood-acpp-force-replan.ts`
- `packages/db/scripts/dogfood-acpp-focus.ts`
- `packages/db/scripts/dogfood-acpp-status.ts`

## Remaining (unattended loop)

- Engineer/fixer finish → PR → CI `check` → auto-accept → Ship Receipt → Open→Done writeback on `P-010`
- After ACPP settles, **Resume** coppergate primary Arena if AG-* backlog should continue

## UI

https://www.coppergate.ai/workspaces/2c894510-810e-46cc-8ff0-652f63870639/projects/f86212ec-24b9-44b7-955d-cda19d833a14
