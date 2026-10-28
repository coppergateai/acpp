import type { AuthorizationDecision } from "@acpp/policy";
import { ProtectedOperationError } from "./errors.js";

/**
 * Proof that the caller evaluated authorization and, when required, recorded approval
 * through explicit SDK steps — never via an implicit auto-approve convenience path.
 */
export type ExecutionAuthorizationProof =
  | {
      kind: "grant_allow";
      decision: AuthorizationDecision;
    }
  | {
      kind: "approval_bound";
      decision: AuthorizationDecision;
      approvalId: string;
    };

/**
 * Build execution proof from a prior {@link AuthorizationDecision}.
 * Does not call the hosted API and never fabricates approvals.
 */
export function buildExecutionAuthorizationProof(
  decision: AuthorizationDecision,
  approvalId?: string,
): ExecutionAuthorizationProof {
  if (!decision.allow) {
    throw new ProtectedOperationError(
      "authorization_denied",
      "Cannot execute: authorization decision is deny. Evaluate policy and obtain a grant before executing.",
    );
  }
  if (decision.requiresApproval) {
    if (!approvalId) {
      throw new ProtectedOperationError(
        "approval_required",
        "Grant requires explicit approval. Call recordApproval() (or POST /v1/approvals) before executing; SDK helpers do not auto-approve.",
      );
    }
    return { kind: "approval_bound", decision, approvalId };
  }
  return { kind: "grant_allow", decision };
}

export function assertProofMatchesDecision(
  proof: ExecutionAuthorizationProof,
  decision: AuthorizationDecision,
): void {
  if (proof.decision.decisionId !== decision.decisionId) {
    throw new ProtectedOperationError(
      "proof_decision_mismatch",
      "Execution proof was built from a different authorization decision. Re-evaluate and rebuild proof.",
    );
  }
}

export function approvalIdFromProof(
  proof: ExecutionAuthorizationProof,
): string | undefined {
  return proof.kind === "approval_bound" ? proof.approvalId : undefined;
}
