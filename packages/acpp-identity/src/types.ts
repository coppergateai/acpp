import { type ActorAddress, type ActorType } from "@acpp/core";

export type IdentityStatus = "active" | "suspended" | "revoked";

export type IdentityRecord = {
  address: ActorAddress;
  actorType: ActorType;
  displayName: string;
  status: IdentityStatus;
  /** Public verification material references (never private keys). */
  keyIds: string[];
  workspaceId: string;
  createdAt: string;
  verifiedAt?: string;
};

export type IdentityKey = {
  keyId: string;
  address: ActorAddress;
  alg: "Ed25519";
  publicKey: string;
  status: "active" | "rotated" | "revoked";
  createdAt: string;
};

export type VerificationResult = {
  ok: boolean;
  address?: ActorAddress;
  keyId?: string;
  reason?: string;
};
