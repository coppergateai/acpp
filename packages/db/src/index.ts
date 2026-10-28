/**
 * Logical persistence model for ACPP (PRODUCT.md §14.4).
 * Drizzle schema + migrations land with P-010 / S-010 Open IDs.
 */
export const LOGICAL_ENTITIES = [
  "Workspace",
  "Actor",
  "IdentityKey",
  "OwnershipRelationship",
  "Capability",
  "Signal",
  "SignalDelivery",
  "Connection",
  "ConnectionCredentialReference",
  "PermissionGrant",
  "Delegation",
  "AuthorizationDecision",
  "ApprovalRequest",
  "Execution",
  "Receipt",
  "AuditEvent",
] as const;

export type LogicalEntity = (typeof LOGICAL_ENTITIES)[number];

export {
  assertOwnershipNotAuthorization,
  createWorkspaceId,
  isWorkspaceId,
  ownershipImpliesAuthorization,
  PRODUCT_ACTOR_TYPES,
  type ActorRecord,
  type ActorStatus,
  type OwnershipKind,
  type OwnershipRelationship,
  type ProductActorType,
  type Workspace,
  type WorkspaceId,
} from "./workspace-model.js";

export {
  WorkspaceStore,
  type AddOwnershipInput,
  type CreateWorkspaceInput,
  type RegisterActorInput,
} from "./workspace-store.js";
