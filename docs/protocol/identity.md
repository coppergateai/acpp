# ACPP Identity (Phase 0)

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
- Public verification material / key ids
- Controller / workspace relationship
- Capability references (permissioned)
- Visibility settings, lifecycle status
- Verification status + timestamps

Never include private keys, OAuth tokens, or personal secrets in public records.

## Lifecycle

Registration → key enrollment → verification → capability publication → rotation → suspension → recovery → revocation.

## Invariant

**Identity is not authority.** Cryptographic proof of key control does not grant permission to act. See `authz.md`.

## MVP crypto

Ed25519 for sender authentication on signals. Exact canonicalization: `signal.md`.
