import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOGICAL_ENTITIES } from "./index.ts";

describe("@acpp/db", () => {
  it("lists logical entities from product model", () => {
    assert.ok(LOGICAL_ENTITIES.includes("Actor"));
    assert.ok(LOGICAL_ENTITIES.includes("IdentityKey"));
    assert.ok(LOGICAL_ENTITIES.includes("Receipt"));
  });
});
