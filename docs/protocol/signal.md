# ACPP Signal envelope (Phase 0)

Signals are structured, attributable messages — **not** Coppergate product-event webhooks.

## Categories (MVP)

| Type | Meaning |
| --- | --- |
| `event` | Something happened |
| `request` | Request an outcome |
| `offer` | Advertise a capability |
| `response` | Reply to a request |
| `approval` | Explicit approve/reject |
| `revocation` | Invalidate grant/credential |

## Logical fields

- `protocolVersion`, `signalId`, `type`
- `sender`, `audience`
- `createdAt`, optional `expiresAt`
- `correlationId`, optional `causationId`
- `contentType`, `payload`
- `auth` (alg, keyId, signature)

Signatures cover security-relevant envelope fields, not payload alone.

## Security requirements

- Canonical serialization for signing (to be frozen in S-010)
- Sender authentication + integrity
- Replay protection + idempotency keys for side-effecting actions
- Audience restriction + expiration
- Safe handling of unknown types
- Max payload size + schema validation

## Handling order

1. Authenticate sender  
2. Validate structure + integrity  
3. Check audience + validity window  
4. Replay / duplicate check  
5. Policy evaluation  
6. Accept / reject / defer / clarify  
7. Authorized handler if needed  
8. Record receipt  

An LLM may interpret payloads; it must **not** be the final authority for security decisions.
