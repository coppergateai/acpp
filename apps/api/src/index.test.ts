import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import {
  ACPP_HOSTED_API_VERSION,
  ACPP_PROTOCOL_SCHEMA_VERSION,
} from "@acpp/schemas";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { signingMessage } from "@acpp/signals";
import { IdentityRegistry } from "@acpp/db";
import { createApiServer, type ApiServerOptions } from "./index.ts";

function signedSignal(
  material: ReturnType<typeof generateEd25519KeyPair>,
  keyId: string,
  sender: string,
  signalId: string,
  overrides: Partial<SignalEnvelope> = {},
): SignalEnvelope {
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId,
    type: "event",
    sender: sender as SignalEnvelope["sender"],
    audience: "acpp:agent:01JAUD",
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: { via: "api" },
    auth: { alg: "Ed25519", keyId, signature: "" },
    ...overrides,
  };
  const signature = signMessage(signingMessage(partial), material.privateKey);
  return { ...partial, auth: { alg: "Ed25519", keyId, signature } };
}

async function withServer(
  registry: IdentityRegistry,
  fn: (port: number) => Promise<void>,
  options: Omit<ApiServerOptions, "registry"> = {},
): Promise<void> {
  const server = createApiServer({ registry, ...options });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  try {
    await fn(addr.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("@acpp/api", () => {
  it("serves health", async () => {
    await withServer(new IdentityRegistry(), async (port) => {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean };
      assert.equal(body.ok, true);
    });
  });

  it("serves OpenAPI and portable protocol schemas", async () => {
    await withServer(new IdentityRegistry(), async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const openapi = await fetch(`${base}/v1/openapi.json`);
      assert.equal(openapi.status, 200);
      const apiDoc = (await openapi.json()) as {
        openapi: string;
        info: { version: string };
        paths: Record<string, unknown>;
      };
      assert.equal(apiDoc.openapi, "3.1.0");
      assert.equal(apiDoc.info.version, ACPP_HOSTED_API_VERSION);
      assert.ok("/v1/signals" in apiDoc.paths);

      const manifest = await fetch(`${base}/v1/protocol/schemas`);
      assert.equal(manifest.status, 200);
      const manifestBody = (await manifest.json()) as {
        protocolVersion: string;
        schemas: { id: string }[];
      };
      assert.equal(manifestBody.protocolVersion, ACPP_PROTOCOL_SCHEMA_VERSION);
      assert.ok(manifestBody.schemas.some((s) => s.id === "signal-envelope"));

      const schema = await fetch(`${base}/v1/protocol/schemas/signal-envelope`);
      assert.equal(schema.status, 200);
      const envelope = (await schema.json()) as { title: string };
      assert.equal(envelope.title, "SignalEnvelope");

      const missing = await fetch(`${base}/v1/protocol/schemas/unknown-id`);
      assert.equal(missing.status, 404);
    });
  });

  it("creates workspace over HTTP", async () => {
    await withServer(new IdentityRegistry(), async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const res = await fetch(`${base}/v1/workspaces`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "http-create",
          slug: "http-create",
          displayName: "HTTP create",
        }),
      });
      assert.equal(res.status, 201);
      const body = (await res.json()) as {
        workspace: { workspaceId: string; slug: string };
      };
      assert.equal(body.workspace.workspaceId, "ws_http-create");
      assert.equal(body.workspace.slug, "http-create");
    });
  });

  it("registers identity and verifies signature over HTTP", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "api",
      slug: "api",
      displayName: "API",
    });
    const material = generateEd25519KeyPair();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const reg = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/identities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorType: "agent",
          actorId: "01JAPI",
          displayName: "API agent",
          publicKey: material.publicKey,
        }),
      });
      assert.equal(reg.status, 201);
      const registered = (await reg.json()) as {
        identity: { address: string };
        key: { keyId: string };
      };
      const message = "hello-acpp";
      const signature = signMessage(message, material.privateKey);
      const verify = await fetch(`${base}/v1/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: registered.identity.address,
          keyId: registered.key.keyId,
          message,
          signature,
        }),
      });
      const verdict = (await verify.json()) as { ok: boolean };
      assert.equal(verdict.ok, true);
    });
  });

  it("accepts authenticated signal and rejects replay over HTTP", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "signals",
      slug: "signals",
      displayName: "Signals",
    });
    const material = generateEd25519KeyPair();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const reg = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/identities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorType: "agent",
          actorId: "01JSAPI",
          displayName: "Signal agent",
          publicKey: material.publicKey,
        }),
      });
      const registered = (await reg.json()) as {
        identity: { address: string };
        key: { keyId: string };
      };
      const envelope = signedSignal(
        material,
        registered.key.keyId,
        registered.identity.address,
        "sig_http_01",
      );
      const submit = await fetch(`${base}/v1/signals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(envelope),
      });
      assert.equal(submit.status, 201);
      const get = await fetch(`${base}/v1/signals/sig_http_01`);
      assert.equal(get.status, 200);
      const replay = await fetch(`${base}/v1/signals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(envelope),
      });
      assert.equal(replay.status, 409);
      const replayBody = (await replay.json()) as { error: string };
      assert.equal(replayBody.error, "replay_rejected");
    });
  });

  it("lists signals by correlationId with delivery ack separate from execution", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "corr-api",
      slug: "corr-api",
      displayName: "Corr API",
    });
    const material = generateEd25519KeyPair();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const reg = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/identities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorType: "agent",
          actorId: "01JCAPI",
          displayName: "Corr agent",
          publicKey: material.publicKey,
        }),
      });
      const registered = (await reg.json()) as {
        identity: { address: string };
        key: { keyId: string };
      };
      const threadId = "thread_http_01";
      const request = signedSignal(
        material,
        registered.key.keyId,
        registered.identity.address,
        "sig_http_req1",
        { type: "request", correlationId: threadId },
      );
      const submit = await fetch(`${base}/v1/signals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      assert.equal(submit.status, 201);
      const created = (await submit.json()) as {
        delivery: { ackState: string; executionState: string };
      };
      assert.equal(created.delivery.ackState, "acknowledged");
      assert.equal(created.delivery.executionState, "not_started");
      const list = await fetch(
        `${base}/v1/signals?correlationId=${encodeURIComponent(threadId)}`,
      );
      assert.equal(list.status, 200);
      const body = (await list.json()) as { signals: unknown[] };
      assert.equal(body.signals.length, 1);
    });
  });

  it("creates grant, evaluates, revokes, and gates approval-bound execution", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "authz-api",
      slug: "authz-api",
      displayName: "Authz API",
    });
    const owner = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "owner",
      displayName: "Owner",
    });
    const material = generateEd25519KeyPair();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const reg = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/identities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorType: "agent",
          actorId: "01JAUTH",
          displayName: "Authz agent",
          publicKey: material.publicKey,
        }),
      });
      assert.equal(reg.status, 201);
      const registered = (await reg.json()) as {
        identity: { address: string };
      };
      const subject = registered.identity.address;
      const resource = "github:repo:org/repo";
      const action = "issues.comment";

      const createGrant = await fetch(`${base}/v1/grants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.workspaceId,
          grantedBy: owner.address,
          subject,
          resource,
          action,
          requiresApproval: true,
        }),
      });
      assert.equal(createGrant.status, 201);
      const grantBody = (await createGrant.json()) as {
        grant: { grantId: string };
      };

      const evaluate = await fetch(`${base}/v1/authorization/evaluate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: ws.workspaceId, subject, resource, action }),
      });
      const decision = (await evaluate.json()) as {
        decision: { allow: boolean; requiresApproval: boolean };
      };
      assert.equal(decision.decision.allow, true);
      assert.equal(decision.decision.requiresApproval, true);

      const payload = { body: "ship it" };
      const blocked = await fetch(`${base}/v1/authorization/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.workspaceId,
          subject,
          resource,
          action,
          payload,
        }),
      });
      assert.equal(blocked.status, 403);
      const blockedBody = (await blocked.json()) as {
        gate: { reason: string };
      };
      assert.equal(blockedBody.gate.reason, "approval_required");

      const approval = await fetch(`${base}/v1/approvals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grantId: grantBody.grant.grantId,
          subject,
          resource,
          action,
          payload,
          approved: true,
        }),
      });
      assert.equal(approval.status, 201);
      const approvalBody = (await approval.json()) as {
        approval: { approvalId: string };
      };

      const execute = await fetch(`${base}/v1/authorization/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.workspaceId,
          subject,
          resource,
          action,
          payload,
          approvalId: approvalBody.approval.approvalId,
        }),
      });
      assert.equal(execute.status, 200);
      const gate = (await execute.json()) as { gate: { allowed: boolean } };
      assert.equal(gate.gate.allowed, true);

      const revoke = await fetch(
        `${base}/v1/grants/${grantBody.grant.grantId}/revoke`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId: ws.workspaceId }),
        },
      );
      assert.equal(revoke.status, 200);

      const denied = await fetch(`${base}/v1/authorization/evaluate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: ws.workspaceId, subject, resource, action }),
      });
      const afterRevoke = (await denied.json()) as { decision: { allow: boolean } };
      assert.equal(afterRevoke.decision.allow, false);
    });
  });

  it("denies authorization without workspace grant and blocks self-grant (SEC-011)", async () => {
    const registry = new IdentityRegistry();
    const wsA = registry.workspace.createWorkspace({
      id: "sec-a",
      slug: "sec-a",
      displayName: "Sec A",
    });
    const wsB = registry.workspace.createWorkspace({
      id: "sec-b",
      slug: "sec-b",
      displayName: "Sec B",
    });
    const ownerA = registry.workspace.registerActor({
      workspaceId: wsA.workspaceId,
      actorType: "human",
      id: "owner-a",
      displayName: "Owner A",
    });
    const agentA = registry.workspace.registerActor({
      workspaceId: wsA.workspaceId,
      actorType: "agent",
      id: "agent-a",
      displayName: "Agent A",
    });
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const resource = "github:repo:org/repo";
      const action = "issues.comment";

      const noGrant = await fetch(`${base}/v1/authorization/evaluate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsA.workspaceId,
          subject: agentA.address,
          resource,
          action,
        }),
      });
      assert.equal(noGrant.status, 200);
      const denyBody = (await noGrant.json()) as { decision: { allow: boolean } };
      assert.equal(denyBody.decision.allow, false);

      const selfGrant = await fetch(`${base}/v1/grants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsA.workspaceId,
          grantedBy: agentA.address,
          subject: agentA.address,
          resource,
          action,
        }),
      });
      assert.equal(selfGrant.status, 409);

      await fetch(`${base}/v1/grants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsA.workspaceId,
          grantedBy: ownerA.address,
          subject: agentA.address,
          resource,
          action,
        }),
      });

      const wrongTenant = await fetch(`${base}/v1/authorization/evaluate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsB.workspaceId,
          subject: agentA.address,
          resource,
          action,
        }),
      });
      assert.equal(wrongTenant.status, 403);
    });
  });

  it("connects GitHub once and executes scoped actions for two agents (P-020)", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "github-wedge",
      slug: "github-wedge",
      displayName: "GitHub wedge",
    });
    const owner = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "owner",
      displayName: "Owner",
    });
    const reader = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "reader",
      displayName: "Reader agent",
    });
    const commenter = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "commenter",
      displayName: "Commenter agent",
    });
    const repo = "coppergateai/acpp";
    const resource = `github:repo:${repo}`;

    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/repos/coppergateai/acpp") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify({ full_name: repo }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/issues/1/comments") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: 1, html_url: "https://github.com/c/1" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    };

    await withServer(
      registry,
      async (port) => {
        const base = `http://127.0.0.1:${port}`;

        const connect = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/connections/github`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            installationId: "999",
            accessToken: "ghs_super_secret",
          }),
        });
        assert.equal(connect.status, 201);
        const connected = (await connect.json()) as {
          connection: { connectionId: string; credentialRef: string };
        };
        const connectionId = connected.connection.connectionId;
        assert.equal(
          JSON.stringify(connected).includes("ghs_super_secret"),
          false,
        );

        const list = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/connections`);
        const listBody = (await list.json()) as { connections: unknown[] };
        assert.equal(listBody.connections.length, 1);
        assert.equal(JSON.stringify(listBody).includes("ghs_super_secret"), false);

        const duplicate = await fetch(
          `${base}/v1/workspaces/${ws.workspaceId}/connections/github`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              installationId: "1000",
              accessToken: "other",
            }),
          },
        );
        assert.equal(duplicate.status, 409);

        for (const [subject, action] of [
          [reader.address, "repos.metadata.read"],
          [commenter.address, "issues.comment"],
        ] as const) {
          const grantRes = await fetch(`${base}/v1/grants`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              workspaceId: ws.workspaceId,
              grantedBy: owner.address,
              subject,
              resource,
              action,
            }),
          });
          assert.equal(grantRes.status, 201);
        }

        const readerDeniedComment = await fetch(`${base}/v1/github/actions/execute`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: reader.address,
            repo,
            action: "issues.comment",
            payload: { issueNumber: 1, body: "nope" },
          }),
        });
        assert.equal(readerDeniedComment.status, 403);

        const readOk = await fetch(`${base}/v1/github/actions/execute`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: reader.address,
            repo,
            action: "repos.metadata.read",
            payload: {},
          }),
        });
        assert.equal(readOk.status, 200);
        const readBody = (await readOk.json()) as {
          execution: { ok: boolean; externalRef: string };
        };
        assert.equal(readBody.execution.ok, true);
        assert.equal(readBody.execution.externalRef, `github:repo:${repo}`);

        const commentOk = await fetch(`${base}/v1/github/actions/execute`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: commenter.address,
            repo,
            action: "issues.comment",
            payload: { issueNumber: 1, body: "from acpp" },
          }),
        });
        assert.equal(commentOk.status, 200);
        const commentBody = (await commentOk.json()) as {
          execution: { ok: boolean };
        };
        assert.equal(commentBody.execution.ok, true);
      },
      { githubHttp: { fetch: mockFetch } },
    );
  });

  it("records receipt chain and proves revoke-then-deny (P-030)", async () => {
    const registry = new IdentityRegistry();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const proof = await fetch(`${base}/v1/demo/wedge-revoke-proof`, {
        method: "POST",
      });
      assert.equal(proof.status, 200);
      const body = (await proof.json()) as {
        workspaceId: string;
        allowReceipt: { receiptId: string; signalId: string };
        denyReceipt: { receiptId: string };
        proof: {
          beforeRevoke: { allowed: boolean; executionOk: boolean };
          afterRevoke: { allowed: boolean; executeStatus: number };
        };
        allowChain: { phase: string }[];
      };
      assert.equal(body.proof.beforeRevoke.allowed, true);
      assert.equal(body.proof.beforeRevoke.executionOk, true);
      assert.equal(body.proof.afterRevoke.allowed, false);
      assert.equal(body.proof.afterRevoke.executeStatus, 403);
      assert.equal(body.allowChain.length, 4);

      const bySignal = await fetch(
        `${base}/v1/signals/${body.allowReceipt.signalId}/receipt?workspaceId=${encodeURIComponent(body.workspaceId)}`,
      );
      assert.equal(bySignal.status, 200);
      const signalReceipt = (await bySignal.json()) as { receipt: { receiptId: string } };
      assert.equal(signalReceipt.receipt.receiptId, body.allowReceipt.receiptId);

      const byId = await fetch(
        `${base}/v1/receipts/${body.denyReceipt.receiptId}?workspaceId=${encodeURIComponent(body.workspaceId)}`,
      );
      assert.equal(byId.status, 200);

      const list = await fetch(
        `${base}/v1/receipts?workspaceId=${encodeURIComponent(body.workspaceId)}`,
      );
      const listed = (await list.json()) as { receipts: unknown[] };
      assert.equal(listed.receipts.length, 2);
    });
  });

  it("discovers identity and policy-permitted capabilities (P-040)", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "ws_disc",
      slug: "disc",
      displayName: "Discovery",
    });
    const owner = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "owner",
      displayName: "Owner",
    });
    const viewer = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "viewer",
      displayName: "Viewer",
    });
    const material = generateEd25519KeyPair();
    await withServer(registry, async (port) => {
      const base = `http://127.0.0.1:${port}`;
      const reg = await fetch(`${base}/v1/workspaces/${ws.workspaceId}/identities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorType: "agent",
          actorId: "01JDISC",
          displayName: "Discovery agent",
          publicKey: material.publicKey,
        }),
      });
      assert.equal(reg.status, 201);
      const registered = (await reg.json()) as {
        identity: { address: string };
      };
      const subject = registered.identity.address;
      const resource = "github:repo:org/repo";
      const action = "issues.comment";

      await fetch(`${base}/v1/grants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.workspaceId,
          grantedBy: owner.address,
          subject,
          resource,
          action,
        }),
      });

      const selfDiscovery = await fetch(
        `${base}/v1/identities/${subject}/capabilities?workspaceId=${encodeURIComponent(ws.workspaceId)}`,
      );
      assert.equal(selfDiscovery.status, 200);
      const selfBody = (await selfDiscovery.json()) as {
        discoveryIsNotConsent: boolean;
        capabilities: { resource: string; action: string }[];
      };
      assert.equal(selfBody.discoveryIsNotConsent, true);
      assert.equal(selfBody.capabilities.length, 1);
      assert.equal(selfBody.capabilities[0]!.resource, resource);

      const crossDenied = await fetch(
        `${base}/v1/identities/${subject}/capabilities?workspaceId=${encodeURIComponent(ws.workspaceId)}&requester=${encodeURIComponent(viewer.address)}`,
      );
      assert.equal(crossDenied.status, 403);

      await fetch(`${base}/v1/grants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.workspaceId,
          grantedBy: owner.address,
          subject: viewer.address,
          resource: `acpp:identity:${subject}`,
          action: "capabilities:read",
        }),
      });

      const crossAllowed = await fetch(
        `${base}/v1/identities/${subject}/capabilities?workspaceId=${encodeURIComponent(ws.workspaceId)}&requester=${encodeURIComponent(viewer.address)}`,
      );
      assert.equal(crossAllowed.status, 200);

      const mcpDiscovery = await fetch(
        `${base}/v1/mcp/capabilities?workspaceId=${encodeURIComponent(ws.workspaceId)}&subject=${encodeURIComponent(subject)}&connectionId=conn_test&allowedTools=search,run_shell`,
      );
      assert.equal(mcpDiscovery.status, 200);
      const mcpBody = (await mcpDiscovery.json()) as { tools: unknown[] };
      assert.equal(mcpBody.tools.length, 0);
    });
  });

  it("connects MCP once and invokes permitted tools with policy gate (P-050)", async () => {
    const registry = new IdentityRegistry();
    const ws = registry.workspace.createWorkspace({
      id: "mcp-wedge",
      slug: "mcp-wedge",
      displayName: "MCP wedge",
    });
    const owner = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "human",
      id: "owner-mcp",
      displayName: "Owner",
    });
    const agent = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "mcp-agent",
      displayName: "MCP agent",
    });
    const other = registry.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "mcp-other",
      displayName: "Other agent",
    });

    const serverUrl = "http://127.0.0.1:9191/mcp";
    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      assert.equal(url, serverUrl);
      const body = JSON.parse(String(init?.body)) as {
        method: string;
        params: { name: string; arguments: Record<string, unknown> };
      };
      assert.equal(body.method, "tools/call");
      if (body.params.name === "search_docs") {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: { structuredContent: { answer: body.params.arguments.query } },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: { message: "unknown_tool" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    await withServer(
      registry,
      async (port) => {
        const base = `http://127.0.0.1:${port}`;

        const connect = await fetch(
          `${base}/v1/workspaces/${ws.workspaceId}/connections/mcp`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              serverUrl,
              allowedTools: ["search_docs"],
              accessToken: "mcp_secret_token",
            }),
          },
        );
        assert.equal(connect.status, 201);
        const connected = (await connect.json()) as {
          connection: { connectionId: string; allowedTools: string[] };
        };
        const connectionId = connected.connection.connectionId;
        assert.equal(
          JSON.stringify(connected).includes("mcp_secret_token"),
          false,
        );

        const resource = `mcp:connection:${connectionId}:tool:search_docs`;
        await fetch(`${base}/v1/grants`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            grantedBy: owner.address,
            subject: agent.address,
            resource,
            action: "invoke",
          }),
        });

        const discovery = await fetch(
          `${base}/v1/mcp/capabilities?workspaceId=${encodeURIComponent(ws.workspaceId)}&subject=${encodeURIComponent(agent.address)}&connectionId=${encodeURIComponent(connectionId)}`,
        );
        assert.equal(discovery.status, 200);
        const discoveryBody = (await discovery.json()) as {
          tools: { name: string }[];
        };
        assert.deepEqual(
          discoveryBody.tools.map((t) => t.name),
          ["search_docs"],
        );

        const denied = await fetch(`${base}/v1/mcp/tools/invoke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: other.address,
            toolName: "search_docs",
            arguments: { query: "nope" },
          }),
        });
        assert.equal(denied.status, 403);

        const ok = await fetch(`${base}/v1/mcp/tools/invoke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: agent.address,
            toolName: "search_docs",
            arguments: { query: "incident runbook" },
          }),
        });
        assert.equal(ok.status, 200);
        const okBody = (await ok.json()) as {
          execution: { ok: boolean; result: { answer: string } };
        };
        assert.equal(okBody.execution.ok, true);
        assert.equal(okBody.execution.result.answer, "incident runbook");

        const offAllowlist = await fetch(`${base}/v1/mcp/tools/invoke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId: ws.workspaceId,
            connectionId,
            subject: agent.address,
            toolName: "run_shell",
            arguments: {},
          }),
        });
        assert.equal(offAllowlist.status, 403);
      },
      { mcpHttp: { fetch: mockFetch }, mcpAllowLocalhost: true },
    );
  });
});
