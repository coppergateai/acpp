import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApiServer } from "./index.ts";

describe("identity HTTP API (P-010)", () => {
  it("registers an agent and returns acpp:agent address + key material", async () => {
    const registry = new (await import("@acpp/identity")).ActorRegistry();
    const ws = registry.workspaceStore.createWorkspace({
      id: "api",
      slug: "api",
      displayName: "API test",
    });
    const server = createApiServer({ registry });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    const port = addr.port;

    const res = await fetch(
      `http://127.0.0.1:${port}/v1/workspaces/${ws.workspaceId.replace(/^ws_/, "")}/agents`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "GitHub worker", actorId: "gh01" }),
      },
    );
    assert.equal(res.status, 201);
    const body = (await res.json()) as {
      identity: { address: string; status: string };
      verified: boolean;
      keyPair: { publicKey: string; privateKey: string };
    };
    assert.equal(body.identity.address, "acpp:agent:gh01");
    assert.equal(body.verified, true);
    assert.ok(body.keyPair.publicKey);
    assert.ok(body.keyPair.privateKey);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
