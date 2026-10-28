import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACPP_PROTOCOL_VERSION,
  SIGNAL_CATEGORY_CATALOG,
  createActorAddress,
  isActorAddress,
  signalCategoryRequiresCorrelation,
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

  it("defines six MVP signal categories with correlation rules", () => {
    assert.equal(SIGNAL_CATEGORY_CATALOG.length, 6);
    assert.equal(signalCategoryRequiresCorrelation("response"), true);
    assert.equal(signalCategoryRequiresCorrelation("approval"), true);
    assert.equal(signalCategoryRequiresCorrelation("request"), false);
  });
});
