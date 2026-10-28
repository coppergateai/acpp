export type {
  IdentityKey,
  IdentityRecord,
  IdentityStatus,
  VerificationResult,
} from "./types.js";

export function assertIdentityNotAuthority(
  verified: boolean,
  authorized: boolean,
): void {
  if (verified && !authorized) {
    // Expected path: known sender, denied action.
    return;
  }
  if (!verified && authorized) {
    throw new Error("Invariant violated: authorization without identity verification");
  }
}

export {
  createKeyId,
  exportRawPublicKey,
  generateActorId,
  generateEd25519KeyPair,
  publicKeyFromRaw,
  signMessage,
  verifyMessage,
  type Ed25519Material,
} from "./crypto.js";

export { verifyIdentitySignature, type VerifySignatureInput } from "./verify.js";
