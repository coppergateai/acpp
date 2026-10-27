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

export { allocateActorAddress, newStableActorId } from "./address.js";
export {
  generateEd25519KeyPair,
  newKeyId,
  signEd25519,
  verifyEd25519,
  type Ed25519KeyMaterial,
} from "./crypto.js";
export { ActorRegistry, type RegisterActorInput, type RotateKeyInput } from "./registry.js";
