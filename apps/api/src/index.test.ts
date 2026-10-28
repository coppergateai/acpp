import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { signingMessage } from "@acpp/signals";
import { IdentityRegistry } from "@acpp/db";
import { createApiServer } from "./index.ts";

function signedSignal(
  material: ReturnType<typeof generateEd25519KeyPair>,
  keyId: string,
  sender: string,
  signalId: string,
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
  };
  const signature = signMessage(signingMessage(partial), material.privateKey);
  return { ...partial, auth: { alg: "Ed25519", keyId, signature } };
}

async function withServer(
  registry: IdentityRegistry,
  fn: (port: number) => Promise<void>,
): Promise<void> {
  const server = createApiServer({ registry });
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
});
