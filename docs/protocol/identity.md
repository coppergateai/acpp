# ACPP Identity (P-010)

## Address

Stable identifiers (not handles):

- `acpp:agent:…`
- `acpp:human:…`
- `acpp:service:…`
- `acpp:organization:…`
- `acpp:application:…`

Handles (e.g. `@research-agent`) may change. Addresses must not silently transfer ownership.

## Record (public)

- Stable address, actor type, display name
- Public verification material / key ids (`IdentityKey` rows — raw Ed25519 public keys, base64url)
- Controller / workspace relationship (see [`workspace.md`](./workspace.md))
- Lifecycle status (`active`, `suspended`, `revoked`)

Never include private keys, OAuth tokens, or personal secrets in public records.

## Lifecycle

Registration → key enrollment → verification → rotation → suspension → revocation.

Implementation:

- **`@acpp/identity`** — Ed25519 key material, `verifyIdentitySignature` (key control only).
- **`@acpp/db`** — `IdentityRegistry` composes `WorkspaceStore` for tenant-scoped actors + keys.
- **`@acpp/api`** — HTTP registration and verification (see below).

## Ed25519 verification

- Keys are enrolled by `keyId` + raw public key (JWK `x`, base64url).
- `verifyIdentitySignature` checks identity status, key status, and cryptographic proof.
- Invalid signatures, rotated keys, and suspended/revoked identities are rejected.

## HTTP API (P-010)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{workspaceId}/identities` | Register actor + enroll first public key |
| `GET` | `/v1/identities/{address}` | Fetch identity + public keys |
| `POST` | `/v1/identities/{address}/keys/rotate` | Rotate active signing key |
| `POST` | `/v1/identities/{address}/suspend` | Suspend identity |
| `POST` | `/v1/verify` | Verify signature for enrolled key |
| `GET` | `/v1/identities/{address}/capabilities` | Authorized capability discovery (P-040 — see [`discovery.md`](./discovery.md)) |

Register body:

```json
{
  "actorType": "agent",
  "displayName": "Research agent",
  "publicKey": "<base64url raw Ed25519 public key>",
  "actorId": "01JOPTIONAL"
}
```

## Invariant

**Identity is not authority.** Cryptographic proof of key control does not grant permission to act. See `authz.md`.

## MVP crypto

Ed25519 for sender authentication on signals. Envelope canonicalization: `signal.md` (frozen in S-010 via `@acpp/signals`).
