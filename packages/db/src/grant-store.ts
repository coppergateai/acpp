import { randomBytes } from "node:crypto";
import type { ActorAddress } from "@acpp/core";
import {
  evaluateGrant,
  gateProtectedAction,
  type ActionBinding,
  type ApprovalRecord,
  type AuthzRequest,
  type ExecutionGate,
  type PermissionGrant,
} from "@acpp/policy";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";
import { WorkspaceStore } from "./workspace-store.js";

export type StoredGrant = PermissionGrant & {
  workspaceId: WorkspaceId;
  createdAt: string;
};

export type CreateGrantInput = {
  grantId?: string;
  workspaceId: WorkspaceId;
  /** Actor issuing the grant — must not be the subject (PRODUCT §14.2). */
  grantedBy: ActorAddress;
  subject: ActorAddress;
  resource: string;
  action: string;
  expiresAt?: string;
  requiresApproval?: boolean;
  createdAt?: string;
};

/** Authorization request scoped to a workspace tenant (PRODUCT §15.2). */
export type TenantAuthzRequest = AuthzRequest & {
  workspaceId: WorkspaceId;
};

export type RecordApprovalInput = {
  approvalId?: string;
  grantId: string;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  approved: boolean;
  decidedAt?: string;
};

function generateGrantId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `gr_${suffix}`.slice(0, 24);
}

function generateApprovalId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `appr_${suffix}`.slice(0, 28);
}

/**
 * In-memory PermissionGrant store scoped to workspaces (PRODUCT §13.2 / §14.4).
 */
export class GrantStore {
  readonly workspace: WorkspaceStore;
  readonly #grants = new Map<string, StoredGrant>();
  readonly #approvals = new Map<string, ApprovalRecord>();

  constructor(workspace?: WorkspaceStore) {
    this.workspace = workspace ?? new WorkspaceStore();
  }

  createGrant(input: CreateGrantInput): StoredGrant {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    this.#assertGranterCanGrant(
      input.workspaceId,
      input.grantedBy,
      input.subject,
    );
    this.workspace.assertActorInWorkspace(input.workspaceId, input.subject);
    const grantId = input.grantId ?? generateGrantId();
    if (this.#grants.has(grantId)) {
      throw new Error(`Grant already exists: ${grantId}`);
    }
    const grant: StoredGrant = {
      grantId,
      workspaceId: input.workspaceId,
      subject: input.subject,
      resource: input.resource,
      action: input.action,
      expiresAt: input.expiresAt,
      requiresApproval: input.requiresApproval ?? false,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#grants.set(grantId, grant);
    return grant;
  }

  getGrant(grantId: string): StoredGrant | undefined {
    return this.#grants.get(grantId);
  }

  listGrants(filter: {
    workspaceId: WorkspaceId;
    subject?: ActorAddress;
  }): StoredGrant[] {
    if (!isWorkspaceId(filter.workspaceId)) {
      throw new Error(`Invalid workspace id: ${filter.workspaceId}`);
    }
    return [...this.#grants.values()].filter((g) => {
      if (g.workspaceId !== filter.workspaceId) {
        return false;
      }
      if (filter.subject && g.subject !== filter.subject) {
        return false;
      }
      return true;
    });
  }

  revokeGrant(
    grantId: string,
    options: { workspaceId?: WorkspaceId; revokedAt?: string } = {},
  ): StoredGrant {
    const grant = this.#grants.get(grantId);
    if (!grant) {
      throw new Error(`Unknown grant: ${grantId}`);
    }
    if (
      options.workspaceId &&
      grant.workspaceId !== options.workspaceId
    ) {
      throw new Error(
        `Tenant isolation: grant ${grantId} is not in workspace ${options.workspaceId}`,
      );
    }
    if (grant.revokedAt) {
      throw new Error(`Grant already revoked: ${grantId}`);
    }
    const updated: StoredGrant = {
      ...grant,
      revokedAt: options.revokedAt ?? new Date().toISOString(),
    };
    this.#grants.set(grantId, updated);
    return updated;
  }

  evaluateAuthorization(req: TenantAuthzRequest) {
    this.workspace.assertActorInWorkspace(req.workspaceId, req.subject);
    return evaluateGrant(this.#grantRowsForWorkspace(req.workspaceId), req);
  }

  recordApproval(input: RecordApprovalInput): ApprovalRecord {
    const grant = this.#grants.get(input.grantId);
    if (!grant) {
      throw new Error(`Unknown grant: ${input.grantId}`);
    }
    if (grant.revokedAt) {
      throw new Error(`Grant revoked: ${input.grantId}`);
    }
    this.workspace.assertActorInWorkspace(grant.workspaceId, input.subject);
    if (
      grant.subject !== input.subject ||
      grant.resource !== input.resource ||
      grant.action !== input.action
    ) {
      throw new Error("Approval does not match grant scope");
    }
    const approvalId = input.approvalId ?? generateApprovalId();
    if (this.#approvals.has(approvalId)) {
      throw new Error(`Approval already exists: ${approvalId}`);
    }
    const record: ApprovalRecord = {
      approvalId,
      grantId: input.grantId,
      subject: input.subject,
      resource: input.resource,
      action: input.action,
      payloadHash: input.payloadHash,
      approved: input.approved,
      decidedAt: input.decidedAt ?? new Date().toISOString(),
    };
    this.#approvals.set(approvalId, record);
    return record;
  }

  getApproval(approvalId: string): ApprovalRecord | undefined {
    return this.#approvals.get(approvalId);
  }

  gateProtectedAction(
    req: TenantAuthzRequest,
    binding: ActionBinding,
    approvalId?: string,
  ): ExecutionGate {
    this.workspace.assertActorInWorkspace(req.workspaceId, req.subject);
    const approval = approvalId ? this.#approvals.get(approvalId) : undefined;
    if (approval) {
      const grant = this.#grants.get(approval.grantId);
      if (!grant || grant.workspaceId !== req.workspaceId) {
        return {
          allowed: false,
          reason: "tenant_grant_mismatch",
          decision: evaluateGrant([], req),
          requiresApproval: false,
          approvalSatisfied: false,
        };
      }
    }
    return gateProtectedAction(
      this.#grantRowsForWorkspace(req.workspaceId),
      req,
      binding,
      approval,
    );
  }

  #grantRowsForWorkspace(workspaceId: WorkspaceId): PermissionGrant[] {
    return [...this.#grants.values()]
      .filter((g) => g.workspaceId === workspaceId)
      .map(({ workspaceId: _ws, createdAt: _at, ...grant }) => grant);
  }

  #assertGranterCanGrant(
    workspaceId: WorkspaceId,
    grantedBy: ActorAddress,
    subject: ActorAddress,
  ): void {
    this.workspace.assertActorInWorkspace(workspaceId, grantedBy);
    if (grantedBy === subject) {
      throw new Error("Self-grant is not allowed");
    }
    const granter = this.workspace.getActor(grantedBy);
    if (!granter) {
      throw new Error(`Unknown granter: ${grantedBy}`);
    }
    if (granter.actorType === "human" || granter.actorType === "service") {
      return;
    }
    if (this.workspace.isController(workspaceId, grantedBy, subject)) {
      return;
    }
    throw new Error(
      "Granter is not authorized to issue grants for this subject",
    );
  }
}
