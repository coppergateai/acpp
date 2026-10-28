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
  overrides: Partial<SignalEnvelope> = {},
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
    ...overrides,
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
      assert.equal(result.delivery.ackState, "acknowledged");
      assert.equal(result.delivery.executionState, "not_started");
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

  it("indexes correlated request/response and rejects unknown causation", () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "corr",
      slug: "corr",
      displayName: "Corr",
    });
    const material = generateEd25519KeyPair();
    const { identity, key } = registry.registerIdentity({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      actorId: "01JCOR",
      displayName: "Sender",
      publicKey: material.publicKey,
    });
    const store = new SignalStore(registry);
    const threadId = "thread_corr_01";
    const request = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_req_corr01",
      { type: "request", correlationId: threadId },
    );
    assert.equal(store.submitSignal(request).ok, true);
    const badCausation = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_rsp_bad01",
      {
        type: "response",
        correlationId: threadId,
        causationId: "sig_missing_9",
      },
    );
    const unknown = store.submitSignal(badCausation);
    assert.equal(unknown.ok, false);
    if (!unknown.ok) {
      assert.equal(unknown.reason, "unknown_causation");
    }
    const response = signedEnvelope(
      material,
      key.keyId,
      identity.address,
      "sig_rsp_corr01",
      {
        type: "response",
        correlationId: threadId,
        causationId: "sig_req_corr01",
      },
    );
    assert.equal(store.submitSignal(response).ok, true);
    const thread = store.listSignalsByCorrelationId(threadId);
    assert.equal(thread.length, 2);
    assert.equal(thread[0]!.signalId, "sig_req_corr01");
    assert.equal(thread[1]!.signalId, "sig_rsp_corr01");
  });
});
