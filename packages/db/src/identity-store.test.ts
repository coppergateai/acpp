import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateEd25519KeyPair,
  signMessage,
} from "@acpp/identity";
import { IdentityRegistry } from "./identity-store.ts";

describe("@acpp/db IdentityRegistry", () => {
  it("registers agent with stable acpp address and enrolls Ed25519 key", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "id-demo",
      slug: "id-demo",
      displayName: "Identity demo",
    });
    const material = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "01JTEST",
      displayName: "Research agent",
      publicKey: material.publicKey,
    });
    assert.match(identity.address, /^acpp:agent:01JTEST$/);
    assert.equal(identity.status, "active");
    assert.deepEqual(identity.keyIds, [key.keyId]);
    assert.equal(key.status, "active");
  });

  it("verifies, rotates, suspends, and revokes keys", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "life",
      slug: "life",
      displayName: "Lifecycle",
    });
    const first = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "bot1",
      displayName: "Bot",
      publicKey: first.publicKey,
    });
    const message = "signal-envelope-stub";
    const sig = signMessage(message, first.privateKey);
    const verified = registry.verifySignature({
      address: identity.address,
      keyId: key.keyId,
      message,
      signature: sig,
    });
    assert.equal(verified.ok, true);

    const second = generateEd25519KeyPair();
    const rotated = registry.rotateKey({
      address: identity.address,
      newPublicKey: second.publicKey,
    });
    assert.equal(rotated.status, "active");
    const oldVerify = registry.verifySignature({
      address: identity.address,
      keyId: key.keyId,
      message,
      signature: sig,
    });
    assert.equal(oldVerify.ok, false);
    assert.equal(oldVerify.reason, "key_not_active");

    const newSig = signMessage(message, second.privateKey);
    const newVerify = registry.verifySignature({
      address: identity.address,
      keyId: rotated.keyId,
      message,
      signature: newSig,
    });
    assert.equal(newVerify.ok, true);

    registry.suspendIdentity(identity.address);
    const suspended = registry.verifySignature({
      address: identity.address,
      keyId: rotated.keyId,
      message,
      signature: newSig,
    });
    assert.equal(suspended.reason, "identity_suspended");

    registry.workspace.setActorStatus(identity.address, "active");
    registry.revokeIdentity(identity.address);
    const revoked = registry.getIdentity(identity.address);
    assert.equal(revoked?.status, "revoked");
    assert.equal(
      registry.listKeys(identity.address).every((k) => k.status === "revoked"),
      true,
    );
  });

  it("enforces workspace tenant boundaries", () => {
    const registry = new IdentityRegistry();
    const a = registry.workspace.createWorkspace({
      id: "ta",
      slug: "ta",
      displayName: "A",
    });
    const b = registry.workspace.createWorkspace({
      id: "tb",
      slug: "tb",
      displayName: "B",
    });
    const material = generateEd25519KeyPair();
    const { identity } = registry.registerIdentity({
      workspaceId: a.workspaceId,
      actorType: "human",
      actorId: "alice",
      displayName: "Alice",
      publicKey: material.publicKey,
    });
    assert.throws(() =>
      registry.assertIdentityInWorkspace(b.workspaceId, identity.address),
    );
    assert.equal(
      registry.assertIdentityInWorkspace(a.workspaceId, identity.address).address,
      identity.address,
    );
  });
});
