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

  it("connects MCP once per workspace with tool allowlist and hidden token", () => {
    const workspace = new WorkspaceStore();
    const ws = workspace.createWorkspace({
      id: "mcp",
      slug: "mcp",
      displayName: "MCP",
    });
    const store = new ConnectionStore(workspace);
    const conn = store.connectMcp({
      workspaceId: ws.workspaceId,
      serverUrl: "https://tools.example.com/mcp",
      allowedTools: ["search_docs", "read_file"],
      accessToken: "mcp_bearer_secret",
    });
    assert.equal(conn.provider, "mcp");
    assert.deepEqual(conn.allowedTools, ["search_docs", "read_file"]);
    assert.equal(JSON.stringify(conn).includes("mcp_bearer"), false);
    assert.equal(store.resolveCredential(conn.credentialRef), "mcp_bearer_secret");
    assert.throws(
      () =>
        store.connectMcp({
          workspaceId: ws.workspaceId,
          serverUrl: "https://other.example/mcp",
          allowedTools: ["x"],
          accessToken: "tok2",
        }),
      /already exists/,
    );
    assert.equal(store.listConnections(ws.workspaceId).length, 1);
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
});
