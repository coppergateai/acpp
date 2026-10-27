import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertIdentityNotAuthority } from "./index.ts";

describe("@acpp/identity", () => {
  it("allows verified-but-unauthorized", () => {
    assert.doesNotThrow(() => assertIdentityNotAuthority(true, false));
  });

  it("rejects authorized-without-verification", () => {
    assert.throws(() => assertIdentityNotAuthority(false, true));
  });
});
