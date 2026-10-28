import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashActionPayload } from "@acpp/policy";
import { GrantStore } from "./grant-store.js";

function humanAndAgent(store: GrantStore) {
  const ws = store.workspace.createWorkspace({
    id: "grants",
    slug: "grants",
    displayName: "Grants",
  });
  const human = store.workspace.registerActor({
    workspaceId: ws.workspaceId,
    actorType: "human",
    id: "owner",
    displayName: "Owner",
  });
  const agent = store.workspace.registerActor({
    workspaceId: ws.workspaceId,
    actorType: "agent",
    id: "worker",
    displayName: "Worker",
  });
  return { ws, human, agent };
}

describe("GrantStore", () => {
  it("creates grant, evaluates allow, and revokes within tenant", () => {
    const store = new GrantStore();
    const { ws, human, agent } = humanAndAgent(store);

    const grant = store.createGrant({
      workspaceId: ws.workspaceId,
      grantedBy: human.address,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(grant.requiresApproval, false);

    const allowed = store.evaluateAuthorization({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(allowed.allow, true);

    store.revokeGrant(grant.grantId, { workspaceId: ws.workspaceId });
    const denied = store.evaluateAuthorization({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(denied.allow, false);
  });

  it("denies by default when no grant exists in tenant", () => {
    const store = new GrantStore();
    const { ws, agent } = humanAndAgent(store);
    const decision = store.evaluateAuthorization({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "no_matching_grant");
  });

  it("does not apply grants from another workspace (tenant isolation)", () => {
    const store = new GrantStore();
    const a = store.workspace.createWorkspace({
      id: "team-a",
      slug: "team-a",
      displayName: "Team A",
    });
    const b = store.workspace.createWorkspace({
      id: "team-b",
      slug: "team-b",
      displayName: "Team B",
    });
    const ownerA = store.workspace.registerActor({
      workspaceId: a.workspaceId,
      actorType: "human",
      id: "owner-a",
      displayName: "Owner A",
    });
    const agentA = store.workspace.registerActor({
      workspaceId: a.workspaceId,
      actorType: "agent",
      id: "bot-a",
      displayName: "Bot A",
    });
    store.createGrant({
      workspaceId: a.workspaceId,
      grantedBy: ownerA.address,
      subject: agentA.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });

    assert.throws(() =>
      store.evaluateAuthorization({
        workspaceId: b.workspaceId,
        subject: agentA.address,
        resource: "github:repo:org/repo",
        action: "issues.comment",
      }),
    );

    const listed = store.listGrants({ workspaceId: b.workspaceId });
    assert.equal(listed.length, 0);
  });

  it("rejects self-grant", () => {
    const store = new GrantStore();
    const { ws, agent } = humanAndAgent(store);
    assert.throws(
      () =>
        store.createGrant({
          workspaceId: ws.workspaceId,
          grantedBy: agent.address,
          subject: agent.address,
          resource: "github:repo:org/repo",
          action: "issues.comment",
        }),
      /Self-grant/,
    );
  });

  it("rejects expired grants at evaluation time", () => {
    const store = new GrantStore();
    const { ws, human, agent } = humanAndAgent(store);
    store.createGrant({
      workspaceId: ws.workspaceId,
      grantedBy: human.address,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const decision = store.evaluateAuthorization({
      workspaceId: ws.workspaceId,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      at: "2026-06-01T00:00:00.000Z",
    });
    assert.equal(decision.allow, false);
  });

  it("requires approval binding before protected execution", () => {
    const store = new GrantStore();
    const { ws, human, agent } = humanAndAgent(store);
    const grant = store.createGrant({
      workspaceId: ws.workspaceId,
      grantedBy: human.address,
      subject: agent.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
      requiresApproval: true,
    });
    const payload = { body: "hello" };
    const payloadHash = hashActionPayload(payload);
    const req = {
      workspaceId: ws.workspaceId,
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
