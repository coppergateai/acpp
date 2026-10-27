import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateGrant, type PermissionGrant } from "@acpp/policy";
import {
  assertOwnershipNotAuthorization,
  ownershipImpliesAuthorization,
  PRODUCT_ACTOR_TYPES,
} from "./workspace-model.ts";
import { WorkspaceStore } from "./workspace-store.ts";

describe("@acpp/db workspace model", () => {
  it("lists PRODUCT §6.1 actor types", () => {
    assert.deepEqual(PRODUCT_ACTOR_TYPES, [
      "human",
      "agent",
      "service",
      "organization",
    ]);
    assert.equal(ownershipImpliesAuthorization(), false);
    assert.doesNotThrow(() => assertOwnershipNotAuthorization(false));
    assert.throws(() => assertOwnershipNotAuthorization(true));
  });

  it("creates workspace and registers human + agent with control edge", () => {
    const store = new WorkspaceStore();
    const ws = store.createWorkspace({
      id: "demo",
      slug: "demo",
      displayName: "Demo workspace",
    });
    const human = store.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "alice",
      displayName: "Alice",
    });
    const agent = store.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "research",
      displayName: "Research agent",
    });
    store.addOwnership({
      workspaceId: ws.workspaceId,
      owner: human.address,
      subject: agent.address,
      kind: "controls",
    });
    assert.equal(store.isController(ws.workspaceId, human.address, agent.address), true);
    assert.equal(store.isController(ws.workspaceId, agent.address, human.address), false);
    assert.equal(store.listActorsInWorkspace(ws.workspaceId).length, 2);
  });

  it("rejects cross-tenant actor access", () => {
    const store = new WorkspaceStore();
    const a = store.createWorkspace({
      id: "a",
      slug: "team-a",
      displayName: "Team A",
    });
    const b = store.createWorkspace({
      id: "b",
      slug: "team-b",
      displayName: "Team B",
    });
    const actorA = store.registerActor({
      workspaceId: a.workspaceId,
      actorType: "human",
      id: "owner",
      displayName: "Owner A",
    });
    const actorB = store.registerActor({
      workspaceId: b.workspaceId,
      actorType: "agent",
      id: "bot",
      displayName: "Bot B",
    });
    assert.throws(() =>
      store.addOwnership({
        workspaceId: a.workspaceId,
        owner: actorA.address,
        subject: actorB.address,
        kind: "controls",
      }),
    );
  });

  it("ownership does not confer authorization (identity ≠ authority)", () => {
    const store = new WorkspaceStore();
    const ws = store.createWorkspace({
      id: "authz",
      slug: "authz",
      displayName: "Authz demo",
    });
    const human = store.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "owner",
      displayName: "Owner",
    });
    const agent = store.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "worker",
      displayName: "Worker",
    });
    store.addOwnership({
      workspaceId: ws.workspaceId,
      owner: human.address,
      subject: agent.address,
      kind: "controls",
    });
    assert.equal(store.isController(ws.workspaceId, human.address, agent.address), true);

    const grants: PermissionGrant[] = [];
    const decision = evaluateGrant(grants, {
      subject: human.address,
      resource: "github:repo:org/repo",
      action: "issues.comment",
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "no_matching_grant");
  });
});
