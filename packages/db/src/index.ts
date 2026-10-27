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
