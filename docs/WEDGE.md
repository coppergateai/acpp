# ACPP wedge (locked)

**Register an agent, connect GitHub once, authorize its access, and verify every consequential interaction with a receipt — then revoke and prove denial.**

## Onboarding steps (TTFV)

1. Create a verifiable agent identity (`acpp:agent:…` + key).
2. Connect GitHub once for the workspace (credential isolated).
3. Grant a scoped permission (resource + action, optional approval).
4. Send/handle an authenticated signal requesting a protected GitHub action.
5. Policy allows → execute → receipt links signal → decision → outcome.
6. Revoke the grant → next attempt is denied.

## Explicitly not the wedge

- Agent marketplace, chat UI, multi-connector sprawl, reputation scores, paid SKU UI.
- Coppergate D13 product-event “signals” (Sentry/CI → task). Those stay in Coppergate.

## Connector

**GitHub** — first production-quality connector (`issues.comment` or `repos.metadata.read`).
