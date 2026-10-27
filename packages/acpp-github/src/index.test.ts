import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeGithubAction, githubResource } from "./index.ts";

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
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, "unauthorized");
  });
});
