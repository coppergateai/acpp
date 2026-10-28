import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsBlindRetry,
  assertExecutionTransition,
  isTerminalExecutionState,
} from "./execution-lifecycle.ts";

describe("execution lifecycle (PRODUCT §14.5)", () => {
  it("blocks blind retry only for outcome_unknown", () => {
    assert.equal(allowsBlindRetry("outcome_unknown"), false);
    assert.equal(allowsBlindRetry("failed"), true);
    assert.equal(allowsBlindRetry("succeeded"), true);
  });

  it("validates allowed transitions", () => {
    assertExecutionTransition("not_started", "authorized");
    assertExecutionTransition("running", "outcome_unknown");
    assert.throws(
      () => assertExecutionTransition("succeeded", "running"),
      /Invalid execution transition/,
    );
  });

  it("marks terminal states", () => {
    assert.equal(isTerminalExecutionState("outcome_unknown"), true);
    assert.equal(isTerminalExecutionState("running"), false);
  });
});
