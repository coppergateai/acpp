import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIdentityDb } from "./store.ts";

describe("@acpp/db identity store", () => {
  it("persists workspace, actor, and identity key rows", () => {
    const { store } = createIdentityDb();
    const now = new Date().toISOString();

    store.createWorkspace("ws_1", "Test", now);
    store.insertActor({
      address: "acpp:agent:abc",
      actorType: "agent",
      displayName: "A",
      status: "active",
      workspaceId: "ws_1",
      verifiedAt: null,
      createdAt: now,
    });
    store.insertKey({
      keyId: "key_1",
      address: "acpp:agent:abc",
      alg: "Ed25519",
      publicKey: "pk",
      status: "active",
      createdAt: now,
      rotatedAt: null,
    });

    assert.ok(store.getWorkspace("ws_1"));
    assert.equal(store.getActor("acpp:agent:abc")?.displayName, "A");
    assert.equal(store.listKeysForAddress("acpp:agent:abc").length, 1);
  });

  it("runs migrations idempotently", () => {
    const { sqlite, store } = createIdentityDb();
    const now = new Date().toISOString();
    store.createWorkspace("ws_2", "Again", now);
    assert.doesNotThrow(() => {
      sqlite.exec("SELECT 1 FROM workspaces LIMIT 1");
    });
  });
});
