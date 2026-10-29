import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConnectionStore } from "./connection-store.ts";
import { WorkspaceStore } from "./workspace-store.ts";

describe("ConnectionStore", () => {
  it("connects GitHub once per workspace and hides tokens from connection records", () => {
    const workspace = new WorkspaceStore();
    const ws = workspace.createWorkspace({
      id: "conn",
      slug: "conn",
      displayName: "Conn",
    });
    const store = new ConnectionStore(workspace);
    const conn = store.connectGithub({
      workspaceId: ws.workspaceId,
      installationId: "12345",
      accessToken: "ghs_secret_token",
    });
    assert.equal(conn.provider, "github");
    assert.ok(conn.credentialRef.startsWith("cred_"));
    assert.equal(
      JSON.stringify(conn).includes("ghs_secret"),
      false,
      "token must not appear on stored connection metadata",
    );
    assert.equal(store.resolveCredential(conn.credentialRef), "ghs_secret_token");
    assert.equal(store.listGithubConnections(ws.workspaceId).length, 1);
  });

  it("rejects a second GitHub connection in the same workspace", () => {
    const workspace = new WorkspaceStore();
    const ws = workspace.createWorkspace({
      id: "once",
      slug: "once",
      displayName: "Once",
    });
    const store = new ConnectionStore(workspace);
    store.connectGithub({
      workspaceId: ws.workspaceId,
      installationId: "1",
      accessToken: "token-a",
    });
    assert.throws(
      () =>
        store.connectGithub({
          workspaceId: ws.workspaceId,
          installationId: "2",
          accessToken: "token-b",
        }),
      /already exists/,
    );
  });

  it("scopes connection lookup by workspace tenant", () => {
    const workspace = new WorkspaceStore();
    const wsA = workspace.createWorkspace({ id: "a", slug: "a", displayName: "A" });
    const wsB = workspace.createWorkspace({ id: "b", slug: "b", displayName: "B" });
    const store = new ConnectionStore(workspace);
    const conn = store.connectGithub({
      workspaceId: wsA.workspaceId,
      installationId: "9",
      accessToken: "tok",
    });
    assert.equal(store.getGithubConnection(conn.connectionId, wsA.workspaceId)?.connectionId, conn.connectionId);
    assert.equal(store.getGithubConnection(conn.connectionId, wsB.workspaceId), undefined);
  });

  it("rotates GitHub credential and invalidates the prior ref (P-021)", () => {
    const workspace = new WorkspaceStore();
    const ws = workspace.createWorkspace({
      id: "rot",
      slug: "rot",
      displayName: "Rot",
    });
    const store = new ConnectionStore(workspace);
    const conn = store.connectGithub({
      workspaceId: ws.workspaceId,
      installationId: "1",
      accessToken: "token-old",
    });
    const oldRef = conn.credentialRef;
    const rotated = store.rotateGithubCredential(
      conn.connectionId,
      ws.workspaceId,
      "token-new",
    );
    assert.notEqual(rotated.credentialRef, oldRef);
    assert.equal(store.resolveCredential(oldRef), undefined);
    assert.equal(store.resolveCredential(rotated.credentialRef), "token-new");
  });

  it("revokes GitHub connection so credential resolve fails (P-021)", () => {
    const workspace = new WorkspaceStore();
    const ws = workspace.createWorkspace({
      id: "rev",
      slug: "rev",
      displayName: "Rev",
    });
    const store = new ConnectionStore(workspace);
    const conn = store.connectGithub({
      workspaceId: ws.workspaceId,
      installationId: "1",
      accessToken: "token-live",
    });
    const ref = conn.credentialRef;
    store.revokeGithubConnection(conn.connectionId, ws.workspaceId);
    assert.equal(store.getGithubConnection(conn.connectionId, ws.workspaceId), undefined);
    assert.equal(store.resolveCredential(ref), undefined);
    assert.equal(store.listGithubConnections(ws.workspaceId).length, 0);
  });
});
