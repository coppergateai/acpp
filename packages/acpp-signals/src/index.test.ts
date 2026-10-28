import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import {
  envelopeContentHash,
  signingMessage,
  stableStringify,
  validateSignalEnvelope,
} from "./index.ts";

function baseEnvelope(overrides: Partial<SignalEnvelope> = {}): SignalEnvelope {
  return {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId: "sig_test_01",
    type: "event",
    sender: "acpp:agent:01JSENDER",
    audience: "acpp:agent:01JRECV",
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: { hello: "world" },
    auth: {
      alg: "Ed25519",
      keyId: "key_placeholder",
      signature: "sig_placeholder",
    },
    ...overrides,
  };
}

describe("@acpp/signals", () => {
  it("stableStringify sorts object keys deterministically", () => {
    assert.equal(
      stableStringify({ b: 1, a: { z: 2, y: 3 } }),
      '{"a":{"y":3,"z":2},"b":1}',
    );
  });

  it("signingMessage excludes signature from auth", () => {
    const envelope = baseEnvelope();
    const msg = signingMessage(envelope);
    assert.equal(msg.includes("signature"), false);
    assert.ok(msg.includes('"keyId":"key_placeholder"'));
  });

  it("validates envelope structure", () => {
    const ok = validateSignalEnvelope(baseEnvelope());
    assert.equal(ok.ok, true);
    const bad = validateSignalEnvelope(baseEnvelope({ signalId: "!!" }));
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.equal(bad.reason, "invalid_signal_id");
    }
  });

  it("round-trips verify with identity crypto", () => {
    const material = generateEd25519KeyPair();
    const envelope = baseEnvelope({
      auth: { alg: "Ed25519", keyId: "key_test", signature: "" },
    });
    const message = signingMessage(envelope);
    const signature = signMessage(message, material.privateKey);
    const signed = { ...envelope, auth: { ...envelope.auth!, signature } };
    assert.equal(validateSignalEnvelope(signed).ok, true);
    assert.equal(envelopeContentHash(signed), envelopeContentHash(signed));
  });
});
