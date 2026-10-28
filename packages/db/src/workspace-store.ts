import {
  createActorAddress,
  type ActorAddress,
  type ActorType,
} from "@acpp/core";
import {
  assertOwnershipNotAuthorization,
  createWorkspaceId,
  isWorkspaceId,
  type ActorRecord,
  type OwnershipKind,
  type OwnershipRelationship,
  type Workspace,
  type WorkspaceId,
} from "./workspace-model.js";

export type CreateWorkspaceInput = {
  id: string;
  slug: string;
  displayName: string;
  createdAt?: string;
};

export type RegisterActorInput = {
  workspaceId: WorkspaceId;
  actorType: ActorType;
  id: string;
  displayName: string;
  createdAt?: string;
};

export type AddOwnershipInput = {
  workspaceId: WorkspaceId;
  owner: ActorAddress;
  subject: ActorAddress;
  kind: OwnershipKind;
  relationshipId?: string;
  createdAt?: string;
};

/**
 * In-memory workspace store (PostgreSQL schema lands with later Open IDs).
 * Enforces tenant boundaries and keeps ownership separate from authorization.
 */
export class WorkspaceStore {
  readonly #workspaces = new Map<WorkspaceId, Workspace>();
  readonly #actors = new Map<ActorAddress, ActorRecord>();
  readonly #ownership = new Map<string, OwnershipRelationship>();

  createWorkspace(input: CreateWorkspaceInput): Workspace {
    const workspaceId = createWorkspaceId(input.id);
    if (this.#workspaces.has(workspaceId)) {
      throw new Error(`Workspace already exists: ${workspaceId}`);
    }
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      throw new Error(`Invalid workspace slug: ${input.slug}`);
    }
    const workspace: Workspace = {
      workspaceId,
      slug: input.slug,
      displayName: input.displayName,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#workspaces.set(workspaceId, workspace);
    return workspace;
  }

  getWorkspace(workspaceId: WorkspaceId): Workspace | undefined {
    return this.#workspaces.get(workspaceId);
  }

  registerActor(input: RegisterActorInput): ActorRecord {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    if (!this.#workspaces.has(input.workspaceId)) {
      throw new Error(`Unknown workspace: ${input.workspaceId}`);
    }
    const address = createActorAddress(input.actorType, input.id);
    if (this.#actors.has(address)) {
      throw new Error(`Actor already registered: ${address}`);
    }
    const record: ActorRecord = {
      address,
      actorType: input.actorType,
      displayName: input.displayName,
      workspaceId: input.workspaceId,
      status: "active",
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#actors.set(address, record);
    this.addOwnership({
      workspaceId: input.workspaceId,
      owner: address,
      subject: address,
      kind: "workspace_member",
      relationshipId: `wm_${address}`,
    });
    return record;
  }

  getActor(address: ActorAddress): ActorRecord | undefined {
    return this.#actors.get(address);
  }

  setActorStatus(
    address: ActorAddress,
    status: ActorRecord["status"],
  ): ActorRecord {
    const record = this.#actors.get(address);
    if (!record) {
      throw new Error(`Unknown actor: ${address}`);
    }
    const updated: ActorRecord = { ...record, status };
    this.#actors.set(address, updated);
    return updated;
  }

  listActorsInWorkspace(workspaceId: WorkspaceId): ActorRecord[] {
    return [...this.#actors.values()].filter(
      (a) => a.workspaceId === workspaceId,
    );
  }

  addOwnership(input: AddOwnershipInput): OwnershipRelationship {
    assertOwnershipNotAuthorization(false);
    this.#assertSameWorkspace(input.workspaceId, input.owner, input.subject);
    const relationshipId =
      input.relationshipId ??
      `own_${input.owner}_${input.subject}_${input.kind}`;
    if (this.#ownership.has(relationshipId)) {
      throw new Error(`Ownership relationship already exists: ${relationshipId}`);
    }
    const relationship: OwnershipRelationship = {
      relationshipId,
      workspaceId: input.workspaceId,
      owner: input.owner,
      subject: input.subject,
      kind: input.kind,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#ownership.set(relationshipId, relationship);
    return relationship;
  }

  listOwnershipForSubject(subject: ActorAddress): OwnershipRelationship[] {
    return [...this.#ownership.values()].filter((r) => r.subject === subject);
  }

  isController(
    workspaceId: WorkspaceId,
    owner: ActorAddress,
    subject: ActorAddress,
  ): boolean {
    const subjectRecord = this.#actors.get(subject);
    if (!subjectRecord || subjectRecord.workspaceId !== workspaceId) {
      return false;
    }
    return [...this.#ownership.values()].some(
      (r) =>
        r.workspaceId === workspaceId &&
        r.owner === owner &&
        r.subject === subject &&
        r.kind === "controls",
    );
  }

  assertActorInWorkspace(
    workspaceId: WorkspaceId,
    address: ActorAddress,
  ): ActorRecord {
    const record = this.#actors.get(address);
    if (!record) {
      throw new Error(`Unknown actor: ${address}`);
    }
    if (record.workspaceId !== workspaceId) {
      throw new Error(
        `Tenant isolation: actor ${address} is not in workspace ${workspaceId}`,
      );
    }
    return record;
  }

  #assertSameWorkspace(
    workspaceId: WorkspaceId,
    owner: ActorAddress,
    subject: ActorAddress,
  ): void {
    const ownerRecord = this.assertActorInWorkspace(workspaceId, owner);
    const subjectRecord = this.assertActorInWorkspace(workspaceId, subject);
    if (ownerRecord.workspaceId !== subjectRecord.workspaceId) {
      throw new Error("Cross-tenant ownership is not allowed");
    }
  }
}
