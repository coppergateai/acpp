import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SignalEnvelope } from "@acpp/core";
import { createApiServer } from "@acpp/api";
import { githubResource } from "@acpp/github";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { IdentityRegistry } from "@acpp/db";
import { AcppClient } from "./client.js";
import { signSignalEnvelope } from "./signals.js";

async function withServer(
  fn: (client: AcppClient) => Promise<void>,
  registry = new IdentityRegistry(),
): Promise<void> {
  const server = createApiServer({ registry });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const client = new AcppClient({ baseUrl: `http://127.0.0.1:${addr.port}` });
  try {
    await fn(client);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("@acpp/client", () => {
  it("reads developer catalog and creates workspace over HTTP", async () => {
    await withServer(async (client) => {
      const catalog = await client.getDeveloperCatalog();
      assert.ok(catalog.routes.length >= 10);
      assert.match(catalog.documentation, /QUICKSTART/);
      const { workspace } = await client.createWorkspace({
        id: "client-ws",
        slug: "client-ws",
        displayName: "Client test",
      });
      assert.match(workspace.workspaceId, /^ws_/);
      const fetched = await client.getWorkspace(workspace.workspaceId);
      assert.equal(fetched.workspace.slug, "client-ws");
    });
  });

  it("runs register → signal → grant → allow → revoke → deny", async () => {
    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/issues/") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: 1, html_url: "https://example.test/1" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const registry = new IdentityRegistry();
    const server = createApiServer({ registry, githubHttp: { fetch: mockFetch } });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    const client = new AcppClient({ baseUrl: `http://127.0.0.1:${addr.port}` });
    try {
      const { workspace } = await client.createWorkspace({
        id: "walk",
        slug: "walk",
        displayName: "Walkthrough",
      });
      const material = generateEd25519KeyPair();
      const humanMat = generateEd25519KeyPair();
      const humanReg = await client.registerIdentity(workspace.workspaceId, {
        actorType: "human",
        actorId: "01HUMAN",
        displayName: "Owner",
        publicKey: humanMat.publicKey,
      });
      const agentReg = await client.registerIdentity(workspace.workspaceId, {
        actorType: "agent",
        actorId: "01AGENT",
        displayName: "Agent",
        publicKey: material.publicKey,
      });
      const message = "acpp-client";
      const signature = signMessage(message, material.privateKey);
      const verify = await client.verifySignature({
        address: agentReg.identity.address,
        keyId: agentReg.key.keyId,
        message,
        signature,
      });
      assert.equal(verify.ok, true);

      const envelope = signSignalEnvelope({
        material,
        keyId: agentReg.key.keyId,
        sender: agentReg.identity.address as SignalEnvelope["sender"],
        signalId: "sig_client_walk",
        payload: { intent: "github.comment" },
      });
      await client.submitSignal(envelope);

      const resource = githubResource("coppergateai/acpp");
      const action = "issues.comment";
      const { grant } = await client.createGrant({
        workspaceId: workspace.workspaceId,
        grantedBy: humanReg.identity.address,
        subject: agentReg.identity.address,
        resource,
        action,
      });
      const allowed = await client.evaluateAuthorization({
        workspaceId: workspace.workspaceId,
        subject: agentReg.identity.address,
        resource,
        action,
      });
      assert.equal(allowed.decision.allow, true);

      const { connection } = await client.connectGithub(workspace.workspaceId, {
        installationId: "123",
        accessToken: "ghs_test",
      });
      const execOk = await client.executeGithubAction({
        workspaceId: workspace.workspaceId,
        connectionId: connection.connectionId,
        subject: agentReg.identity.address,
        repo: "coppergateai/acpp",
        action,
        payload: { issueNumber: 1, body: "via sdk" },
        signalId: "sig_client_walk",
      });
      assert.equal(execOk.gate.allowed, true);
      assert.equal(execOk.execution?.ok, true);

      await client.revokeGrant(grant.grantId, { workspaceId: workspace.workspaceId });
      const denied = await client.evaluateAuthorization({
        workspaceId: workspace.workspaceId,
        subject: agentReg.identity.address,
        resource,
        action,
      });
      assert.equal(denied.decision.allow, false);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
