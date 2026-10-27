import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIdentityDb } from "@acpp/db";
import {
  ActorRegistry,
  generateEd25519KeyPair,
  signEd25519,
} from "./index.ts";

function setupRegistry() {
  const { store } = createIdentityDb();
  store.createWorkspace("ws_demo", "Demo", new Date().toISOString());
  return new ActorRegistry(store);
}

describe("ActorRegistry", () => {
  it("registers actor with stable address and Ed25519 key", () => {
    const registry = setupRegistry();
    const material = generateEd25519KeyPair();
    const record = registry.register({
      workspaceId: "ws_demo",
      actorType: "agent",
      displayName: "Research Agent",
      publicKey: material.publicKey,
      keyId: material.keyId,
    });

    assert.match(record.address, /^acpp:agent:[A-Za-z0-9_-]+$/);
    assert.equal(record.status, "active");
    assert.deepEqual(record.keyIds, [material.keyId]);
  });

  it("verifies signatures with active keys", () => {
    const registry = setupRegistry();
    const material = generateEd25519KeyPair();
    const record = registry.register({
      workspaceId: "ws_demo",
      actorType: "agent",
      displayName: "Signer",
      publicKey: material.publicKey,
      keyId: material.keyId,
    });

    const message = "acpp-signal-canonical-v0";
    const signature = signEd25519(message, material.privateKey);
    const result = registry.verifySignature({
      address: record.address,
      keyId: material.keyId,
      message,
      signature,
    });
    assert.equal(result.ok, true);
    assert.equal(result.address, record.address);
  });

  it("rejects verification when actor is suspended", () => {
    const registry = setupRegistry();
    const material = generateEd25519KeyPair();
    const record = registry.register({
      workspaceId: "ws_demo",
      actorType: "human",
      displayName: "Owner",
      publicKey: material.publicKey,
      keyId: material.keyId,
    });

    registry.suspend(record.address);
    const signature = signEd25519("payload", material.privateKey);
    const result = registry.verifySignature({
      address: record.address,
      keyId: material.keyId,
      message: "payload",
      signature,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "actor_suspended");
  });

  it("rotates keys and retires the previous active key", () => {
    const registry = setupRegistry();
    const first = generateEd25519KeyPair();
    const record = registry.register({
      workspaceId: "ws_demo",
      actorType: "service",
      displayName: "Webhook",
      publicKey: first.publicKey,
      keyId: first.keyId,
    });

    const second = generateEd25519KeyPair();
    registry.rotateKey({
      address: record.address,
      currentKeyId: first.keyId,
      newKeyId: second.keyId,
      newPublicKey: second.publicKey,
    });

    const keys = registry.listKeys(record.address);
    const oldKey = keys.find((k) => k.keyId === first.keyId);
    const newKey = keys.find((k) => k.keyId === second.keyId);
    assert.equal(oldKey?.status, "rotated");
    assert.equal(newKey?.status, "active");

    const sigOld = signEd25519("m", first.privateKey);
    assert.equal(
      registry.verifySignature({
        address: record.address,
        keyId: first.keyId,
        message: "m",
        signature: sigOld,
      }).ok,
      false,
    );

    const sigNew = signEd25519("m", second.privateKey);
    assert.equal(
      registry.verifySignature({
        address: record.address,
        keyId: second.keyId,
        message: "m",
        signature: sigNew,
      }).ok,
      true,
    );
  });
});
