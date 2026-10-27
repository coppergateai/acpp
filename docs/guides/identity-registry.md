# Identity registry (P-010)

Register actors with **stable ACPP addresses** and manage **Ed25519** verification keys. Identity proves key control; it does **not** grant permission to act (see [`docs/protocol/authz.md`](../protocol/authz.md)).

## Packages

| Package | Role |
| --- | --- |
| `@acpp/identity` | `ActorRegistry`, Ed25519 helpers, address allocation |
| `@acpp/db` | SQLite + Drizzle schema (`Workspace`, `Actor`, `IdentityKey`) |

## Quick example

```typescript
import { createIdentityDb } from "@acpp/db";
import {
  ActorRegistry,
  generateEd25519KeyPair,
  signEd25519,
} from "@acpp/identity";

const { store } = createIdentityDb({ filename: "acpp.db" });
store.createWorkspace("ws_1", "My workspace", new Date().toISOString());

const registry = new ActorRegistry(store);
const keys = generateEd25519KeyPair();

const actor = registry.register({
  workspaceId: "ws_1",
  actorType: "agent",
  displayName: "Research agent",
  publicKey: keys.publicKey,
  keyId: keys.keyId,
});

const message = "example-signal-bytes";
const signature = signEd25519(message, keys.privateKey);

const verified = registry.verifySignature({
  address: actor.address,
  keyId: keys.keyId,
  message,
  signature,
});
// verified.ok === true

registry.rotateKey({
  address: actor.address,
  currentKeyId: keys.keyId,
  newKeyId: "key_next",
  newPublicKey: nextKeys.publicKey,
});

registry.suspend(actor.address);
// verifySignature → actor_suspended
```

## Lifecycle

1. **Register** — allocate `acpp:{type}:{id}` and enroll the first active key.
2. **Verify** — check Ed25519 signatures against active keys; suspended/revoked actors fail closed.
3. **Rotate** — mark the current key `rotated`, enroll a new `active` key.
4. **Suspend** — block verification for the actor without deleting history.

Private keys stay off-server. Only SPKI/PKCS8 material in base64 is stored for public keys.

## Persistence

Default development storage is SQLite (`createIdentityDb`). Set `DATABASE_URL` for hosted Postgres in a later increment; the logical model matches `PRODUCT.md` §14.4.
