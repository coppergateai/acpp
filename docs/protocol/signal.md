# ACPP Signal envelope

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

## Canonical signing (S-010)

Protocol version for new signals: `0.1.0` (`ACPP_PROTOCOL_VERSION`).

1. Build a **signable object** from the envelope:
   - Include: `protocolVersion`, `signalId`, `type`, `sender`, `audience`, `createdAt`, optional `expiresAt`, optional `correlationId`, optional `causationId`, `contentType`, `payload`, and `auth` with **`alg` and `keyId` only** (no `signature`).
   - If `audience` is an array, sort member addresses lexicographically before signing.
   - Omit optional fields when absent (do not sign `null` placeholders).
2. Serialize with **stable JSON**: recursively sort object keys; preserve array order.
3. Sign the UTF-8 bytes of that string with Ed25519 (`@acpp/identity` helpers).
4. Attach `auth.signature` (base64url) on the wire envelope.

Implementation: `@acpp/signals` (`signingMessage`, `validateSignalEnvelope`).

### Identifier and size rules

- `signalId`: `[A-Za-z0-9_-]{8,128}` — also the idempotency key for delivery.
- Max canonical payload size: 256 KiB (UTF-8 JSON of `payload`).

## Security requirements

- Sender authentication + integrity (Ed25519 over canonical bytes)
- Replay protection: duplicate `signalId` submissions are **rejected**; no second `SignalDelivery` row
- Audience restriction + expiration (`expiresAt` in the past → reject)
- Safe handling of unknown types (reject until registered in protocol version)
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

## HTTP (MVP)

```http
POST /v1/signals
GET  /v1/signals/{signal_id}
```

- **201** — first delivery accepted; persists `Signal` + `SignalDelivery`.
- **409** — `replay_rejected` or `signal_id_conflict` (includes prior record on replay).
- **400** — invalid envelope or signature.

Persistence: in-memory `SignalStore` in `@acpp/db` (logical model matches future PostgreSQL tables).
