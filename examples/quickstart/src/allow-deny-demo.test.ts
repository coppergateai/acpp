import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  runCompactAllowDenyDemo,
  runExplicitAllowDenyDemo,
} from "./allow-deny-demo.ts";
import { withMockApiServer } from "./test-harness.ts";

describe("allow/deny quickstart demo", () => {
  it("compact wedge proof allows then denies after revoke", async () => {
    await withMockApiServer(async (baseUrl) => {
      const result = await runCompactAllowDenyDemo(baseUrl);
      assert.equal(result.mode, "compact");
      assert.equal(result.allowed, true);
      assert.equal(result.denied, true);
      assert.ok(result.allowReceiptId);
      assert.ok(result.denyReceiptId);
    });
  });

  it("explicit HTTP steps allow then deny (PRODUCT §17.1)", async () => {
    await withMockApiServer(async (baseUrl) => {
      const result = await runExplicitAllowDenyDemo(baseUrl);
      assert.equal(result.mode, "explicit");
      assert.equal(result.allowed, true);
      assert.equal(result.denied, true);
      assert.match(result.workspaceId, /^ws_/);
    });
  });
});
