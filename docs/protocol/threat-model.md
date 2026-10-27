# ACPP threat model (Phase 0 sketch)

## Assets

- Agent private keys and connection credentials
- Authorization grants and approval state
- Audit/receipt integrity
- Tenant/workspace boundaries

## Adversaries

- Compromised agent runtime (prompt injection, tool abuse)
- Stolen API keys / session tokens
- Cross-tenant callers
- Replay of signed signals
- Malicious MCP/GitHub servers (confused deputy)

## Mitigations (MVP direction)

| Threat | Mitigation |
| --- | --- |
| Prompt injection | Policy engine outside the LLM; tool allowlists |
| Stolen connection token | Credential refs + seal; never expose to unauthorized agents |
| Cross-tenant | Server-side workspace membership checks |
| Replay | Signal id + validity window + consumed-state store |
| Privilege escalation | No self-grant; no increasing delegation |
| False trust | Identity ≠ authority messaging; receipts distinguish delivery vs execution |

## Out of scope for MVP

Global reputation, E2EE private messaging, blockchain identity, universal decentralized discovery.
