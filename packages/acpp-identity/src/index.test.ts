import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertIdentityNotAuthority,
  createKeyId,
  generateEd25519KeyPair,
  signMessage,
  verifyIdentitySignature,
  verifyMessage,
} from "./index.ts";

describe("@acpp/identity", () => {
  it("allows verified-but-unauthorized", () => {
    assert.doesNotThrow(() => assertIdentityNotAuthority(true, false));
  });

  it("rejects authorized-without-verification", () => {
    assert.throws(() => assertIdentityNotAuthority(false, true));
  });

  it("signs and verifies Ed25519 messages", () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const message = "acpp:identity:probe";
    const signature = signMessage(message, privateKey);
    assert.equal(verifyMessage(message, signature, publicKey), true);
    assert.equal(verifyMessage(message, signature + "x", publicKey), false);
  });

  it("rejects invalid signatures for enrolled keys", () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const keyId = createKeyId(publicKey);
    const other = generateEd25519KeyPair();
    const signature = signMessage("payload", other.privateKey);
    const result = verifyIdentitySignature({
      identity: {
        address: "acpp:agent:01JTEST",
        status: "active",
      },
      keys: [
        {
          keyId,
          address: "acpp:agent:01JTEST",
          alg: "Ed25519",
          publicKey,
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
      keyId,
      message: "payload",
      signature,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_signature");

    const good = signMessage("payload", privateKey);
    const ok = verifyIdentitySignature({
      identity: {
        address: "acpp:agent:01JTEST",
        status: "active",
      },
      keys: [
        {
          keyId,
          address: "acpp:agent:01JTEST",
          alg: "Ed25519",
          publicKey,
          status: "active",
          createdAt: new Date().toISOString(),
        },
      ],
      keyId,
      message: "payload",
      signature: good,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.address, "acpp:agent:01JTEST");
  });

  it("rejects verification when identity is suspended or key rotated", () => {
    const { publicKey, privateKey } = generateEd25519KeyPair();
    const keyId = createKeyId(publicKey);
    const signature = signMessage("x", privateKey);
    const baseKey = {
      keyId,
      address: "acpp:agent:01JTEST" as const,
      alg: "Ed25519" as const,
      publicKey,
      createdAt: new Date().toISOString(),
    };
    const suspended = verifyIdentitySignature({
      identity: { address: "acpp:agent:01JTEST", status: "suspended" },
      keys: [{ ...baseKey, status: "active" }],
      keyId,
      message: "x",
      signature,
    });
    assert.equal(suspended.reason, "identity_suspended");

    const rotated = verifyIdentitySignature({
      identity: { address: "acpp:agent:01JTEST", status: "active" },
      keys: [{ ...baseKey, status: "rotated" }],
      keyId,
      message: "x",
      signature,
    });
    assert.equal(rotated.reason, "key_not_active");
  });
});
