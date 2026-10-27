import { isActorAddress, type ActorAddress, type ActorType } from "@acpp/core";
import type { IdentityStore } from "@acpp/db";
import { allocateActorAddress } from "./address.js";
import { verifyEd25519 } from "./crypto.js";
import type { IdentityKey, IdentityRecord, IdentityStatus, VerificationResult } from "./types.js";

export type RegisterActorInput = {
  workspaceId: string;
  actorType: ActorType;
  displayName: string;
  /** Ed25519 SPKI DER (base64). */
  publicKey: string;
  keyId: string;
  /** Optional fixed address; otherwise a new stable address is allocated. */
  address?: ActorAddress;
  createdAt?: string;
};

export type RotateKeyInput = {
  address: ActorAddress;
  currentKeyId: string;
  newPublicKey: string;
  newKeyId: string;
  rotatedAt?: string;
};

export class ActorRegistry {
  constructor(private readonly store: IdentityStore) {}

  register(input: RegisterActorInput): IdentityRecord {
    if (!this.store.getWorkspace(input.workspaceId)) {
      throw new Error(`Unknown workspace: ${input.workspaceId}`);
    }
    const address = input.address ?? allocateActorAddress(input.actorType);
    if (!isActorAddress(address)) {
      throw new Error(`Invalid actor address: ${address}`);
    }
    const typeSegment = address.split(":")[1];
    if (typeSegment !== input.actorType) {
      throw new Error("Address does not match actor type");
    }
    if (this.store.getActor(address)) {
      throw new Error(`Actor already registered: ${address}`);
    }
    if (this.store.getKey(input.keyId)) {
      throw new Error(`Key id already in use: ${input.keyId}`);
    }

    const createdAt = input.createdAt ?? new Date().toISOString();
    this.store.insertActor({
      address,
      actorType: input.actorType,
      displayName: input.displayName,
      status: "active",
      workspaceId: input.workspaceId,
      verifiedAt: null,
      createdAt,
    });
    this.store.insertKey({
      keyId: input.keyId,
      address,
      alg: "Ed25519",
      publicKey: input.publicKey,
      status: "active",
      createdAt,
      rotatedAt: null,
    });

    return this.toRecord(address);
  }

  /** Mark identity verified after out-of-band checks (MVP: explicit operator step). */
  markVerified(address: ActorAddress, verifiedAt?: string): IdentityRecord {
    const actor = this.requireActiveActor(address);
    const at = verifiedAt ?? new Date().toISOString();
    this.store.updateActorStatus(actor.address, actor.status, at);
    return this.toRecord(address);
  }

  verifySignature(input: {
    address: ActorAddress;
    keyId: string;
    message: string | Uint8Array;
    signature: string;
  }): VerificationResult {
    const actor = this.store.getActor(input.address);
    if (!actor) {
      return { ok: false, reason: "unknown_actor" };
    }
    if (actor.status === "suspended") {
      return { ok: false, address: input.address, reason: "actor_suspended" };
    }
    if (actor.status === "revoked") {
      return { ok: false, address: input.address, reason: "actor_revoked" };
    }

    const key = this.store.getKey(input.keyId);
    if (!key || key.address !== input.address) {
      return { ok: false, address: input.address, reason: "unknown_key" };
    }
    if (key.status !== "active") {
      return {
        ok: false,
        address: input.address,
        keyId: input.keyId,
        reason: "key_not_active",
      };
    }

    const ok = verifyEd25519(input.message, input.signature, key.publicKey);
    if (!ok) {
      return {
        ok: false,
        address: input.address,
        keyId: input.keyId,
        reason: "invalid_signature",
      };
    }

    return { ok: true, address: input.address, keyId: input.keyId };
  }

  rotateKey(input: RotateKeyInput): IdentityKey {
    this.requireActiveActor(input.address);
    const current = this.store.getKey(input.currentKeyId);
    if (!current || current.address !== input.address) {
      throw new Error("Current key not found for actor");
    }
    if (current.status !== "active") {
      throw new Error("Current key is not active");
    }
    if (this.store.getKey(input.newKeyId)) {
      throw new Error(`Key id already in use: ${input.newKeyId}`);
    }

    const rotatedAt = input.rotatedAt ?? new Date().toISOString();
    this.store.updateKeyStatus(input.currentKeyId, "rotated", rotatedAt);
    this.store.insertKey({
      keyId: input.newKeyId,
      address: input.address,
      alg: "Ed25519",
      publicKey: input.newPublicKey,
      status: "active",
      createdAt: rotatedAt,
      rotatedAt: null,
    });

    const row = this.store.getKey(input.newKeyId);
    if (!row) {
      throw new Error("Failed to persist rotated key");
    }
    return this.toKey(row);
  }

  suspend(address: ActorAddress): IdentityRecord {
    const actor = this.store.getActor(address);
    if (!actor) {
      throw new Error(`Unknown actor: ${address}`);
    }
    if (actor.status === "revoked") {
      throw new Error("Cannot suspend a revoked actor");
    }
    this.store.updateActorStatus(address, "suspended");
    return this.toRecord(address);
  }

  getRecord(address: ActorAddress): IdentityRecord | undefined {
    if (!this.store.getActor(address)) return undefined;
    return this.toRecord(address);
  }

  listKeys(address: ActorAddress): IdentityKey[] {
    return this.store.listKeysForAddress(address).map((row) => this.toKey(row));
  }

  private requireActiveActor(address: ActorAddress) {
    const actor = this.store.getActor(address);
    if (!actor) {
      throw new Error(`Unknown actor: ${address}`);
    }
    if (actor.status !== "active") {
      throw new Error(`Actor is not active: ${actor.status}`);
    }
    return actor;
  }

  private toRecord(address: string): IdentityRecord {
    const actor = this.store.getActor(address);
    if (!actor) {
      throw new Error(`Unknown actor: ${address}`);
    }
    const keys = this.store.listKeysForAddress(address);
    return {
      address: actor.address as ActorAddress,
      actorType: actor.actorType as ActorType,
      displayName: actor.displayName,
      status: actor.status as IdentityStatus,
      keyIds: keys.map((k) => k.keyId),
      workspaceId: actor.workspaceId,
      createdAt: actor.createdAt,
      ...(actor.verifiedAt ? { verifiedAt: actor.verifiedAt } : {}),
    };
  }

  private toKey(row: {
    keyId: string;
    address: string;
    alg: string;
    publicKey: string;
    status: string;
    createdAt: string;
  }): IdentityKey {
    return {
      keyId: row.keyId,
      address: row.address as ActorAddress,
      alg: "Ed25519",
      publicKey: row.publicKey,
      status: row.status as IdentityKey["status"],
      createdAt: row.createdAt,
    };
  }
}
