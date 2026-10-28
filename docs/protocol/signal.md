# ACPP Signal envelope

Signals are structured, attributable messages — **not** Coppergate product-event webhooks.

## Categories (MVP)

Catalog: `@acpp/core` `SIGNAL_CATEGORY_CATALOG` (PRODUCT §8.1).

| Type | Meaning | `correlationId` |
| --- | --- | --- |
| `event` | Something happened | optional |
| `request` | Request an outcome | optional (often set to thread id) |
| `offer` | Advertise a capability | optional |
| `response` | Reply to a request | **required** |
| `approval` | Explicit approve/reject | **required** |
| `revocation` | Invalidate grant/credential | optional |

`response` and `approval` without `correlationId` are rejected at validation (`missing_correlation_id`).

When `causationId` is present it must reference an already-delivered `signalId` (`unknown_causation` otherwise).

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

## Delivery acknowledgement vs execution (S-011)

Gateway delivery (PRODUCT §8.4) records explicit acknowledgement on `SignalDelivery`:

| Field | Meaning |
| --- | --- |
| `ackState` | `acknowledged` when the gateway accepted authenticated delivery; `rejected` when delivery failed |
| `executionState` | Side-effect lifecycle (PRODUCT §14.5). **Always `not_started` at delivery** — accepting a signal is not executing a protected action |

Downstream connectors and policy engines advance `executionState`; the signal HTTP gateway does not.

Legacy field `status` (`accepted` / `rejected`) mirrors gateway accept/reject for S-010 callers.

## Security requirements

- Sender authentication + integrity (Ed25519 over canonical bytes)
- Replay protection: duplicate `signalId` submissions are **rejected**; no second `SignalDelivery` row
- Audience restriction + expiration (`expiresAt` in the past → reject)
- Correlation rules per category; causation references must exist
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
GET  /v1/signals?correlationId={thread_id}
```

- **201** — first delivery accepted; persists `Signal` + `SignalDelivery` (`ackState: acknowledged`, `executionState: not_started`).
- **200** (`?correlationId=`) — signals in the same correlation thread, each with its delivery record.
- **409** — `replay_rejected` or `signal_id_conflict` (includes prior record on replay).
- **400** — invalid envelope or signature.

Persistence: in-memory `SignalStore` in `@acpp/db` (logical model matches future PostgreSQL tables).
