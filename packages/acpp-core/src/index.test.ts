import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACPP_PROTOCOL_VERSION,
  createActorAddress,
  isActorAddress,
} from "./index.ts";

describe("@acpp/core", () => {
  it("exports protocol version", () => {
    assert.equal(ACPP_PROTOCOL_VERSION, "0.1.0");
  });

  it("creates and validates actor addresses", () => {
    const addr = createActorAddress("agent", "01JTEST");
    assert.equal(addr, "acpp:agent:01JTEST");
    assert.equal(isActorAddress(addr), true);
    assert.equal(isActorAddress("agent:01JTEST"), false);
  });
});
