import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  executeGithubAction,
  githubResource,
  parseGithubRepo,
  performGithubHttpAction,
} from "./index.ts";

describe("@acpp/github", () => {
  it("formats resource ids", () => {
    assert.equal(githubResource("acme/app"), "github:repo:acme/app");
  });

  it("refuses unauthorized execution", async () => {
    const r = await executeGithubAction(
      {
        subject: "acpp:agent:01JTEST",
        connectionId: "c1",
        repo: "acme/app",
        action: "issues.comment",
      },
      false,
      { token: "ghs_test" },
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, "unauthorized");
  });

  it("refuses execution without a resolved token", async () => {
    const r = await executeGithubAction(
      {
        subject: "acpp:agent:01JTEST",
        connectionId: "c1",
        repo: "acme/app",
        action: "repos.metadata.read",
      },
      true,
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, "connection_credential_unavailable");
  });

  it("reads repo metadata over HTTP", async () => {
    const mockFetch: typeof fetch = async (input) => {
      assert.equal(String(input), "https://api.github.com/repos/acme/app");
      return new Response(JSON.stringify({ full_name: "acme/app", id: 99 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const r = await performGithubHttpAction(
      {
        subject: "acpp:agent:01J",
        connectionId: "c1",
        repo: "acme/app",
        action: "repos.metadata.read",
      },
      "ghs_test",
      { fetch: mockFetch },
    );
    assert.equal(r.ok, true);
    assert.equal(r.externalRef, "github:repo:acme/app");
  });

  it("creates issue comments over HTTP", async () => {
    const mockFetch: typeof fetch = async (input, init) => {
      assert.equal(
        String(input),
        "https://api.github.com/repos/acme/app/issues/7/comments",
      );
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as { body: string };
      assert.equal(body.body, "hello from acpp");
      return new Response(JSON.stringify({ id: 42, html_url: "https://github.com/a/b#42" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };
    const r = await performGithubHttpAction(
      {
        subject: "acpp:agent:01J",
        connectionId: "c1",
        repo: "acme/app",
        action: "issues.comment",
        payload: { issueNumber: 7, body: "hello from acpp" },
      },
      "ghs_test",
      { fetch: mockFetch },
    );
    assert.equal(r.ok, true);
    assert.equal(r.externalRef, "https://github.com/a/b#42");
  });

  it("validates repo slugs", () => {
    assert.throws(() => parseGithubRepo("bad"), /invalid_repo/);
  });
});
