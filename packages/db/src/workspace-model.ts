import type { ActorAddress, ActorType } from "@acpp/core";

/** Tenant boundary — every persisted record is scoped to one workspace. */
export type WorkspaceId = `ws_${string}`;

export type Workspace = {
  workspaceId: WorkspaceId;
  slug: string;
  displayName: string;
  createdAt: string;
};

export type ActorStatus = "active" | "suspended" | "revoked";

/**
 * Logical Actor entity (PRODUCT.md §14.4). Distinct from authorization grants.
 */
export type ActorRecord = {
  address: ActorAddress;
  actorType: ActorType;
  displayName: string;
  workspaceId: WorkspaceId;
  status: ActorStatus;
  createdAt: string;
};

/**
 * Primary actor kinds from PRODUCT.md §6.1 (application is a client type in §6.1).
 */
export const PRODUCT_ACTOR_TYPES = [
  "human",
  "agent",
  "service",
  "organization",
] as const satisfies readonly ActorType[];

export type ProductActorType = (typeof PRODUCT_ACTOR_TYPES)[number];

export type OwnershipKind =
  /** Actor is a member of the workspace tenant. */
  | "workspace_member"
  /** Owner may administer subject identity lifecycle (not protected API access). */
  | "controls"
  /** Subject is associated with an organization actor within the workspace. */
  | "organizational_member";

/**
 * Ownership / control edges (PRODUCT.md §14.4). These do not create PermissionGrants.
 */
export type OwnershipRelationship = {
  relationshipId: string;
  workspaceId: WorkspaceId;
  owner: ActorAddress;
  subject: ActorAddress;
  kind: OwnershipKind;
  createdAt: string;
};

export function isWorkspaceId(value: string): value is WorkspaceId {
  return /^ws_[A-Za-z0-9_-]+$/.test(value);
}

export function createWorkspaceId(id: string): WorkspaceId {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid workspace id suffix: ${id}`);
  }
  return `ws_${id}`;
}

/** Ownership and control never substitute for an explicit authorization grant. */
export function ownershipImpliesAuthorization(): false {
  return false;
}

export function assertOwnershipNotAuthorization(
  treatingOwnershipAsGrant: boolean,
): void {
  if (treatingOwnershipAsGrant) {
    throw new Error(
      "Invariant violated: ownership or control cannot confer authorization",
    );
  }
}
