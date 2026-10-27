import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runWedgeSketch } from "./demo.ts";

describe("wedge-github sketch", () => {
  it("allows then denies after revoke", async () => {
    const r = await runWedgeSketch();
    assert.equal(r.beforeRevoke, true);
    assert.equal(r.afterRevoke, false);
  });
});
