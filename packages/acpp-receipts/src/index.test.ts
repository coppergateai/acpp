import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReceipt,
  describeReceiptChain,
  executionOutcomeFromGate,
  executionOutcomeFromGithub,
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

  it("maps github and gate results to execution outcomes", () => {
    assert.deepEqual(executionOutcomeFromGithub({ ok: true, externalRef: "x" }), {
      status: "succeeded",
      externalRef: "x",
    });
    assert.deepEqual(executionOutcomeFromGithub({ ok: false, error: "unauthorized" }), {
      status: "denied",
      reason: "policy_denied",
    });
    assert.deepEqual(
      executionOutcomeFromGate({ allowed: false, reason: "revoked" }),
      { status: "denied", reason: "revoked" },
    );
  });

  it("describes signal → verification → decision → outcome chain", () => {
    const receipt = buildReceipt({
      receiptId: "r1",
      signalId: "sig_wedge",
      sender: "acpp:agent:01JTEST",
      verificationOk: true,
      decision: {
        decisionId: "d1",
        allow: true,
        reason: "grant_match",
        requiresApproval: false,
        evaluatedAt: "2026-01-01T00:00:00.000Z",
      },
      execution: { status: "succeeded", externalRef: "github:repo:org/repo" },
    });
    const chain = describeReceiptChain(receipt, { type: "request" });
    assert.equal(chain.length, 4);
    assert.equal(chain[0]!.phase, "signal");
    assert.equal(chain[2]!.phase, "decision");
    assert.equal(chain[3]!.phase, "execution");
    assert.equal(chain[3]!.ok, true);
  });
});
