import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { IdentityRegistry } from "@acpp/db";
import { createApiServer } from "./index.ts";

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
});
