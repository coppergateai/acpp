/**
 * Logical persistence model for ACPP (PRODUCT.md §14.4).
 * Drizzle schema + SQLite store ship with P-010 (Actor + IdentityKey).
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
  createIdentityDb,
  IdentityStore,
  type ActorRow,
  type IdentityDb,
  type IdentityKeyRow,
} from "./store.js";
export { migrateIdentitySchema } from "./migrate.js";
export * as identitySchema from "./schema.js";
