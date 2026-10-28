import type { ActorAddress } from "@acpp/core";
import { verifyMessage } from "./crypto.js";
import type { IdentityKey, IdentityRecord, VerificationResult } from "./types.js";

export type VerifySignatureInput = {
  identity: Pick<IdentityRecord, "address" | "status">;
  keys: IdentityKey[];
  keyId: string;
  message: string | Uint8Array;
  signature: string;
};

/**
 * Proves key control for a registered identity — not permission to act.
 */
export function verifyIdentitySignature(
  input: VerifySignatureInput,
): VerificationResult {
  const { identity, keys, keyId, message, signature } = input;
  if (identity.status === "suspended") {
    return { ok: false, reason: "identity_suspended" };
  }
  if (identity.status === "revoked") {
    return { ok: false, reason: "identity_revoked" };
  }
  const key = keys.find((k) => k.keyId === keyId && k.address === identity.address);
  if (!key) {
    return { ok: false, reason: "unknown_key" };
  }
  if (key.status !== "active") {
    return { ok: false, reason: "key_not_active" };
  }
  const valid = verifyMessage(message, signature, key.publicKey);
  if (!valid) {
    return { ok: false, reason: "invalid_signature" };
  }
  return {
    ok: true,
    address: identity.address as ActorAddress,
    keyId: key.keyId,
  };
}
