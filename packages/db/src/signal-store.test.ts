import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import {
  generateEd25519KeyPair,
  signMessage,
  type Ed25519Material,
} from "@acpp/identity";
import { signingMessage } from "@acpp/signals";
import { IdentityRegistry } from "./identity-store.js";
import { SignalStore } from "./signal-store.js";

function signedEnvelope(
  material: Ed25519Material,
  keyId: string,
  sender: string,
  signalId: string,
): SignalEnvelope {
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId,
    type: "event",
    sender: sender as SignalEnvelope["sender"],
    audience: "acpp:agent:01JAUD",
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: { n: 1 },
    auth: { alg: "Ed25519", keyId, signature: "" },
  };
  const signature = signMessage(signingMessage(partial), material.privateKey);
  return {
    ...partial,
    auth: { alg: "Ed25519", keyId, signature },
  };
}

describe("SignalStore", () => {
  it("persists signal and delivery on authenticated submit", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "sig",
      slug: "sig",
      displayName: "Signals",
    });
    const material = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "01JSIG",
      displayName: "Sender",
      publicKey: material.publicKey,
    });
    const store = new SignalStore(registry);
    const envelope = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_accept_01",
    );
    const result = store.submitSignal(envelope);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.created, true);
      assert.equal(result.delivery.status, "accepted");
      assert.equal(result.signal.workspaceId, ws.workspaceId);
    }
    assert.ok(store.getSignal("sig_accept_01"));
    assert.ok(store.getDelivery("sig_accept_01"));
  });

  it("rejects replay without duplicate delivery records", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "replay",
      slug: "replay",
      displayName: "Replay",
    });
    const material = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "01JRP",
      displayName: "Sender",
      publicKey: material.publicKey,
    });
    const store = new SignalStore(registry);
    const envelope = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_replay_01",
    );
    assert.equal(store.submitSignal(envelope).ok, true);
    const replay = store.submitSignal(envelope);
    assert.equal(replay.ok, false);
    if (!replay.ok) {
      assert.equal(replay.reason, "replay_rejected");
      assert.ok(replay.existing);
    }
  });

  it("rejects invalid signatures", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "bad",
      slug: "bad",
      displayName: "Bad",
    });
    const material = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "01JBAD",
      displayName: "Sender",
      publicKey: material.publicKey,
    });
    const store = new SignalStore(registry);
    const envelope = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_bad_sig",
    );
    envelope.auth!.signature = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const result = store.submitSignal(envelope);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "invalid_signature");
    }
    assert.equal(store.getSignal("sig_bad_sig"), undefined);
  });
});
