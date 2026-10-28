import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashActionPayload } from "@acpp/policy";
import { GrantStore } from "./grant-store.js";

describe("GrantStore", () => {
  it("creates grant, evaluates allow, and revokes", () => {
    const store = new GrantStore();
    const ws = store.workspace.createWorkspace({
      id: "grants",
      slug: "grants",
      displayName: "Grants",
    });
    const agent = store.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "worker",
      displayName: "Worker",
    });

    const grant = store.createGrant({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(grant.requiresApproval, false);

    const allowed = store.evaluateAuthorization({
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(allowed.allow, true);

    store.revokeGrant(grant.grantId);
    const denied = store.evaluateAuthorization({
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(denied.allow, false);
  });

  it("rejects expired grants at evaluation time", () => {
    const store = new GrantStore();
    const ws = store.workspace.createWorkspace({
      id: "exp",
      slug: "exp",
      displayName: "Exp",
    });
    const agent = store.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "exp-agent",
      displayName: "Exp agent",
    });
    store.createGrant({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const decision = store.evaluateAuthorization({
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      at: "2026-06-01T00:00:00.000Z",
    });
    assert.equal(decision.allow, false);
  });

  it("requires approval binding before protected execution", () => {
    const store = new GrantStore();
    const ws = store.workspace.createWorkspace({
      id: "appr",
      slug: "appr",
      displayName: "Appr",
    });
    const agent = store.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "appr-agent",
      displayName: "Appr agent",
    });
    const grant = store.createGrant({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      requiresApproval: true,
    });
    const payload = { body: "hello" };
    const payloadHash = hashActionPayload(payload);
    const req = {
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment" as const,
    };

    const blocked = store.gateProtectedAction(req, { payloadHash });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "approval_required");

    const approval = store.recordApproval({
      grantId: grant.grantId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      payloadHash,
      approved: true,
    });
    const allowed = store.gateProtectedAction(req, { payloadHash }, approval.approvalId);
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.reason, "approval_bound");

    const changed = store.gateProtectedAction(
      req,
      { payloadHash: hashActionPayload({ body: "changed" }) },
      approval.approvalId,
    );
    assert.equal(changed.allowed, false);
    assert.equal(changed.reason, "approval_payload_mismatch");
  });
});
