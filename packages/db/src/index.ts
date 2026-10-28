/**
 * Logical persistence model for ACPP (PRODUCT.md §14.4).
 * Signal persistence is in-memory for S-010; PostgreSQL/Drizzle migrations follow the same model.
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

export {
  IdentityRegistry,
  type RegisterIdentityInput,
  type RotateKeyInput,
  type VerifyStoredSignatureInput,
} from "./identity-store.js";

export {
  SignalStore,
  type SignalDeliveryRecord,
  type SignalDeliveryStatus,
  type SignalRecord,
  type SubmitSignalResult,
} from "./signal-store.js";

export {
  GrantStore,
  type CreateGrantInput,
  type RecordApprovalInput,
  type StoredGrant,
  type TenantAuthzRequest,
} from "./grant-store.js";

export {
  ConnectionStore,
  type ConnectGithubInput,
  type StoredGithubConnection,
} from "./connection-store.js";
