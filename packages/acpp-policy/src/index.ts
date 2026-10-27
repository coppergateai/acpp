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
