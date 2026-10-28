import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApiServer } from "@acpp/api";
import { runWedgeSketch } from "./demo.ts";
import { runHttpWalkthrough } from "./walkthrough.ts";

describe("wedge-github sketch", () => {
  it("allows then denies after revoke", async () => {
    const r = await runWedgeSketch();
    assert.equal(r.beforeRevoke, true);
    assert.equal(r.afterRevoke, false);
  });

  it("HTTP walkthrough allows GitHub then denies after revoke", async () => {
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
    const server = createApiServer({ githubHttp: { fetch: mockFetch } });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    assert.ok(addr && typeof addr === "object");
    try {
      const result = await runHttpWalkthrough({
        baseUrl: `http://127.0.0.1:${addr.port}`,
      });
      assert.equal(result.allowedBeforeRevoke, true);
      assert.equal(result.githubExecuted, true);
      assert.equal(result.deniedAfterRevoke, true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
