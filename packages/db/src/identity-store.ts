import type { ActorAddress, ActorType } from "@acpp/core";
import {
  createKeyId,
  generateActorId,
  type IdentityKey,
  type IdentityRecord,
  type IdentityStatus,
  verifyIdentitySignature,
} from "@acpp/identity";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";
import { WorkspaceStore, type RegisterActorInput } from "./workspace-store.js";

export type RegisterIdentityInput = {
  workspaceId: WorkspaceId;
  actorType: ActorType;
  /** Stable id suffix; generated when omitted. */
  actorId?: string;
  displayName: string;
  /** Raw Ed25519 public key (base64url). */
  publicKey: string;
  createdAt?: string;
};

export type RotateKeyInput = {
  address: ActorAddress;
  newPublicKey: string;
  createdAt?: string;
};

export type VerifyStoredSignatureInput = {
  address: ActorAddress;
  keyId: string;
  message: string | Uint8Array;
  signature: string;
};

/**
 * Actor registry with Ed25519 key lifecycle (PRODUCT §6 / §13.2).
 * Composes {@link WorkspaceStore} for tenant-scoped actors.
 */
export class IdentityRegistry {
  readonly workspace: WorkspaceStore;
  readonly #keys = new Map<string, IdentityKey>();

  constructor(workspace?: WorkspaceStore) {
    this.workspace = workspace ?? new WorkspaceStore();
  }

  registerIdentity(input: RegisterIdentityInput): {
    identity: IdentityRecord;
    key: IdentityKey;
  } {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    const actorId = input.actorId ?? generateActorId();
    const registerInput: RegisterActorInput = {
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      id: actorId,
      displayName: input.displayName,
      createdAt: input.createdAt,
    };
    const actor = this.workspace.registerActor(registerInput);
    const key = this.#enrollKey(actor.address, input.publicKey, input.createdAt);
    const identity = this.getIdentity(actor.address);
    if (!identity) {
      throw new Error(`Identity missing after registration: ${actor.address}`);
    }
    return { identity, key };
  }

  getIdentity(address: ActorAddress): IdentityRecord | undefined {
    const actor = this.workspace.getActor(address);
    if (!actor) {
      return undefined;
    }
    const keys = this.listKeys(address);
    return {
      address: actor.address,
      actorType: actor.actorType,
      displayName: actor.displayName,
      status: actor.status as IdentityStatus,
      keyIds: keys.map((k) => k.keyId),
      workspaceId: actor.workspaceId,
      createdAt: actor.createdAt,
    };
  }

  getKey(keyId: string): IdentityKey | undefined {
    return this.#keys.get(keyId);
  }

  listKeys(address: ActorAddress): IdentityKey[] {
    return [...this.#keys.values()]
      .filter((k) => k.address === address)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  rotateKey(input: RotateKeyInput): IdentityKey {
    const identity = this.getIdentity(input.address);
    if (!identity) {
      throw new Error(`Unknown identity: ${input.address}`);
    }
    if (identity.status !== "active") {
      throw new Error(`Cannot rotate keys for ${identity.status} identity`);
    }
    const now = input.createdAt ?? new Date().toISOString();
    for (const key of this.listKeys(input.address)) {
      if (key.status === "active") {
        this.#keys.set(key.keyId, { ...key, status: "rotated" });
      }
    }
    return this.#enrollKey(input.address, input.newPublicKey, now);
  }

  suspendIdentity(address: ActorAddress): IdentityRecord {
    this.workspace.setActorStatus(address, "suspended");
    const identity = this.getIdentity(address);
    if (!identity) {
      throw new Error(`Identity missing: ${address}`);
    }
    return identity;
  }

  revokeIdentity(address: ActorAddress): IdentityRecord {
    this.workspace.setActorStatus(address, "revoked");
    for (const key of this.listKeys(address)) {
      if (key.status === "active" || key.status === "rotated") {
        this.#keys.set(key.keyId, { ...key, status: "revoked" });
      }
    }
    const identity = this.getIdentity(address);
    if (!identity) {
      throw new Error(`Identity missing: ${address}`);
    }
    return identity;
  }

  verifySignature(input: VerifyStoredSignatureInput) {
    const identity = this.getIdentity(input.address);
    if (!identity) {
      return { ok: false as const, reason: "unknown_identity" };
    }
    return verifyIdentitySignature({
      identity,
      keys: this.listKeys(input.address),
      keyId: input.keyId,
      message: input.message,
      signature: input.signature,
    });
  }

  assertIdentityInWorkspace(
    workspaceId: WorkspaceId,
    address: ActorAddress,
  ): IdentityRecord {
    this.workspace.assertActorInWorkspace(workspaceId, address);
    const identity = this.getIdentity(address);
    if (!identity) {
      throw new Error(`Unknown identity: ${address}`);
    }
    return identity;
  }

  #enrollKey(
    address: ActorAddress,
    publicKey: string,
    createdAt?: string,
  ): IdentityKey {
    const keyId = createKeyId(publicKey);
    if (this.#keys.has(keyId)) {
      throw new Error(`Key already enrolled: ${keyId}`);
    }
    const key: IdentityKey = {
      keyId,
      address,
      alg: "Ed25519",
      publicKey,
      status: "active",
      createdAt: createdAt ?? new Date().toISOString(),
    };
    this.#keys.set(keyId, key);
    return key;
  }
}
