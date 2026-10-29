import { createHash } from "node:crypto";
import type { ActorAddress } from "@acpp/core";

export type PermissionGrant = {
  grantId: string;
  subject: ActorAddress;
  resource: string;
  action: string;
  expiresAt?: string;
  revokedAt?: string;
  requiresApproval: boolean;
};

export type AuthorizationDecision = {
  decisionId: string;
  allow: boolean;
  reason: string;
  grantId?: string;
  requiresApproval: boolean;
  evaluatedAt: string;
};

export type AuthzRequest = {
  subject: ActorAddress;
  resource: string;
  action: string;
  at?: string;
};

/** Approver decision bound to an exact resource, action, and payload hash. */
export type ApprovalRecord = {
  approvalId: string;
  grantId: string;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  approved: boolean;
  decidedAt: string;
};

export type ApprovalRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired";

/**
 * Pending approval inbox row (PRODUCT §9.4 / §11.6).
 * Bound to grant scope + payload hash; stale or materially changed requests must not execute.
 */
export type ApprovalRequest = {
  requestId: string;
  grantId: string;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  reason?: string;
  context?: string;
  risks?: string[];
  expiresAt: string;
  status: ApprovalRequestStatus;
  createdAt: string;
  decidedAt?: string;
  /** Set when decided via recordApproval path. */
  approvalId?: string;
};

export type ActionBinding = {
  payloadHash: string;
};

export type ExecutionGate = {
  allowed: boolean;
  reason: string;
  decision: AuthorizationDecision;
  requiresApproval: boolean;
  approvalSatisfied: boolean;
};

/** SHA-256 (base64url) over stable JSON for approval binding. */
export function hashActionPayload(payload: unknown): string {
  const stable = JSON.stringify(payload ?? null);
  return createHash("sha256").update(stable).digest("base64url");
}

/**
 * Deterministic policy evaluation. No LLM in the decision path.
 * No grant means no protected access.
 */
export function evaluateGrant(
  grants: PermissionGrant[],
  req: AuthzRequest,
): AuthorizationDecision {
  const now = req.at ?? new Date().toISOString();
  const match = grants.find((g) => {
    if (g.subject !== req.subject) return false;
    if (g.resource !== req.resource) return false;
    if (g.action !== req.action) return false;
    if (g.revokedAt) return false;
    if (g.expiresAt && g.expiresAt <= now) return false;
    return true;
  });

  if (!match) {
    return {
      decisionId: `deny_${req.subject}_${req.action}`,
      allow: false,
      reason: "no_matching_grant",
      requiresApproval: false,
      evaluatedAt: now,
    };
  }

  return {
    decisionId: `allow_${match.grantId}`,
    allow: true,
    reason: "grant_match",
    grantId: match.grantId,
    requiresApproval: match.requiresApproval,
    evaluatedAt: now,
  };
}

/**
 * After a grant matches, enforce approval binding when the grant requires it.
 * Stale or materially changed payloads must not execute (payload hash mismatch).
 */
export function gateProtectedAction(
  grants: PermissionGrant[],
  req: AuthzRequest,
  binding: ActionBinding,
  approval?: ApprovalRecord | null,
): ExecutionGate {
  const decision = evaluateGrant(grants, req);
  if (!decision.allow) {
    return {
      allowed: false,
      reason: decision.reason,
      decision,
      requiresApproval: false,
      approvalSatisfied: false,
    };
  }

  if (!decision.requiresApproval) {
    return {
      allowed: true,
      reason: "grant_match",
      decision,
      requiresApproval: false,
      approvalSatisfied: true,
    };
  }

  if (!approval?.approved) {
    return {
      allowed: false,
      reason: "approval_required",
      decision,
      requiresApproval: true,
      approvalSatisfied: false,
    };
  }

  if (approval.grantId !== decision.grantId) {
    return {
      allowed: false,
      reason: "approval_grant_mismatch",
      decision,
      requiresApproval: true,
      approvalSatisfied: false,
    };
  }

  if (
    approval.subject !== req.subject ||
    approval.resource !== req.resource ||
    approval.action !== req.action
  ) {
    return {
      allowed: false,
      reason: "approval_scope_mismatch",
      decision,
      requiresApproval: true,
      approvalSatisfied: false,
    };
  }

  if (approval.payloadHash !== binding.payloadHash) {
    return {
      allowed: false,
      reason: "approval_payload_mismatch",
      decision,
      requiresApproval: true,
      approvalSatisfied: false,
    };
  }

  return {
    allowed: true,
    reason: "approval_bound",
    decision,
    requiresApproval: true,
    approvalSatisfied: true,
  };
}
