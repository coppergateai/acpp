import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReceipt,
  receiptImpliesExternalSuccess,
} from "./index.ts";

describe("@acpp/receipts", () => {
  it("does not imply success for unknown execution", () => {
    const r = buildReceipt({
      receiptId: "r1",
      signalId: "s1",
      sender: "acpp:agent:01JTEST",
      verificationOk: true,
      decision: {
        decisionId: "d1",
        allow: true,
        reason: "grant_match",
        requiresApproval: false,
        evaluatedAt: "2026-01-01T00:00:00.000Z",
      },
      execution: { status: "unknown", note: "no_ack" },
    });
    assert.equal(receiptImpliesExternalSuccess(r), false);
  });
});
