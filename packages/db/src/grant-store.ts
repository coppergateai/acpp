import { randomBytes } from "node:crypto";
import type { ActorAddress } from "@acpp/core";
import {
  evaluateGrant,
  gateProtectedAction,
  type ActionBinding,
  type ApprovalRecord,
  type ApprovalRequest,
  type ApprovalRequestStatus,
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

export type StoredApprovalRequest = ApprovalRequest & {
  workspaceId: WorkspaceId;
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

export type CreateApprovalRequestInput = {
  requestId?: string;
  workspaceId: WorkspaceId;
  grantId: string;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  reason?: string;
  context?: string;
  risks?: string[];
  expiresAt: string;
  createdAt?: string;
};

export type DecideApprovalRequestInput = {
  approved: boolean;
  decidedAt?: string;
  /** When provided, must match the pending request payload hash (reject material change). */
  payloadHash?: string;
};

function generateGrantId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `gr_${suffix}`.slice(0, 24);
}

function generateApprovalId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `appr_${suffix}`.slice(0, 28);
}

function generateApprovalRequestId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `areq_${suffix}`.slice(0, 28);
}

/**
 * In-memory PermissionGrant store scoped to workspaces (PRODUCT §13.2 / §14.4).
 * Approval inbox (SEC-012) lives alongside final ApprovalRecord decisions.
 */
export class GrantStore {
  readonly workspace: WorkspaceStore;
  readonly #grants = new Map<string, StoredGrant>();
  readonly #approvals = new Map<string, ApprovalRecord>();
  readonly #approvalRequests = new Map<string, StoredApprovalRequest>();

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

  createApprovalRequest(
    input: CreateApprovalRequestInput,
  ): StoredApprovalRequest {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    const grant = this.#grants.get(input.grantId);
    if (!grant) {
      throw new Error(`Unknown grant: ${input.grantId}`);
    }
    if (grant.workspaceId !== input.workspaceId) {
      throw new Error(
        `Tenant isolation: grant ${input.grantId} is not in workspace ${input.workspaceId}`,
      );
    }
    if (grant.revokedAt) {
      throw new Error(`Grant revoked: ${input.grantId}`);
    }
    this.workspace.assertActorInWorkspace(input.workspaceId, input.subject);
    if (
      grant.subject !== input.subject ||
      grant.resource !== input.resource ||
      grant.action !== input.action
    ) {
      throw new Error("Approval request does not match grant scope");
    }
    if (!grant.requiresApproval) {
      throw new Error("Grant does not require approval");
    }
    const now = input.createdAt ?? new Date().toISOString();
    if (input.expiresAt <= now) {
      throw new Error("Approval request expiresAt must be in the future");
    }
    if (grant.expiresAt && grant.expiresAt <= now) {
      throw new Error(`Grant expired: ${input.grantId}`);
    }
    const requestId = input.requestId ?? generateApprovalRequestId();
    if (this.#approvalRequests.has(requestId)) {
      throw new Error(`Approval request already exists: ${requestId}`);
    }
    const row: StoredApprovalRequest = {
      requestId,
      workspaceId: input.workspaceId,
      grantId: input.grantId,
      subject: input.subject,
      resource: input.resource,
      action: input.action,
      payloadHash: input.payloadHash,
      reason: input.reason,
      context: input.context,
      risks: input.risks,
      expiresAt: input.expiresAt,
      status: "pending",
      createdAt: now,
    };
    this.#approvalRequests.set(requestId, row);
    return row;
  }

  getApprovalRequest(requestId: string): StoredApprovalRequest | undefined {
    return this.#approvalRequests.get(requestId);
  }

  listApprovalRequests(filter: {
    workspaceId: WorkspaceId;
    status?: ApprovalRequestStatus;
    at?: string;
  }): StoredApprovalRequest[] {
    if (!isWorkspaceId(filter.workspaceId)) {
      throw new Error(`Invalid workspace id: ${filter.workspaceId}`);
    }
    const now = filter.at ?? new Date().toISOString();
    const rows: StoredApprovalRequest[] = [];
    for (const row of this.#approvalRequests.values()) {
      if (row.workspaceId !== filter.workspaceId) continue;
      const current = this.#expireIfNeeded(row, now);
      if (filter.status && current.status !== filter.status) continue;
      rows.push(current);
    }
    return rows;
  }

  /**
   * Decide a pending approval request: re-check grant validity and payload binding,
   * then create an ApprovalRecord via recordApproval (SEC-012).
   */
  decideApprovalRequest(
    requestId: string,
    input: DecideApprovalRequestInput,
  ): { request: StoredApprovalRequest; approval: ApprovalRecord } {
    const existing = this.#approvalRequests.get(requestId);
    if (!existing) {
      throw new Error(`Unknown approval request: ${requestId}`);
    }
    const now = input.decidedAt ?? new Date().toISOString();
    const row = this.#expireIfNeeded(existing, now);
    if (row.status === "expired") {
      throw new Error(`Approval request expired: ${requestId}`);
    }
    if (row.status !== "pending") {
      throw new Error(`Approval request already decided: ${requestId}`);
    }
    if (
      input.payloadHash !== undefined &&
      input.payloadHash !== row.payloadHash
    ) {
      throw new Error("Approval request payload materially changed");
    }
    const grant = this.#grants.get(row.grantId);
    if (!grant || grant.revokedAt) {
      throw new Error(`Grant no longer valid: ${row.grantId}`);
    }
    if (grant.expiresAt && grant.expiresAt <= now) {
      throw new Error(`Grant expired: ${row.grantId}`);
    }
    if (
      grant.subject !== row.subject ||
      grant.resource !== row.resource ||
      grant.action !== row.action
    ) {
      throw new Error("Approval request no longer matches grant scope");
    }

    const approval = this.recordApproval({
      grantId: row.grantId,
      subject: row.subject,
      resource: row.resource,
      action: row.action,
      payloadHash: row.payloadHash,
      approved: input.approved,
      decidedAt: now,
    });

    const updated: StoredApprovalRequest = {
      ...row,
      status: input.approved ? "approved" : "denied",
      decidedAt: now,
      approvalId: approval.approvalId,
    };
    this.#approvalRequests.set(requestId, updated);
    return { request: updated, approval };
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

  #expireIfNeeded(
    row: StoredApprovalRequest,
    now: string,
  ): StoredApprovalRequest {
    if (row.status === "pending" && row.expiresAt <= now) {
      const expired: StoredApprovalRequest = {
        ...row,
        status: "expired",
        decidedAt: now,
      };
      this.#approvalRequests.set(row.requestId, expired);
      return expired;
    }
    return row;
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
