import assert from "node:assert/strict";
import type { Server } from "node:http";
import { describe, it } from "node:test";
import { createApiServer } from "@acpp/api";
import { runWedgeHttpDemo } from "./http-demo.ts";

async function mockGithubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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
}

describe("wedge-github HTTP demo (A-010)", () => {
  it("proves allow then deny against @acpp/api", async () => {
    const server: Server = createApiServer({
      githubHttp: { fetch: mockGithubFetch },
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    try {
      const result = await runWedgeHttpDemo(baseUrl);
      assert.equal(result.allowed, true);
      assert.equal(result.denied, true);
      assert.ok(result.workspaceId.startsWith("ws_"));
      assert.ok(result.allowReceiptId);
      assert.ok(result.denyReceiptId);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
