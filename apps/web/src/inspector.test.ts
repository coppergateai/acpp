import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderChainSteps,
  renderDashboardPage,
  renderReceiptInspector,
  type WedgeProofPayload,
} from "./inspector.ts";

const sampleProof: WedgeProofPayload = {
  workspaceId: "ws_test",
  allowReceipt: { receiptId: "rcpt_allow", signalId: "sig_allow" },
  denyReceipt: { receiptId: "rcpt_deny", signalId: "sig_deny" },
  allowChain: [
    { phase: "signal", label: "Signal", detail: "request", ok: true },
    { phase: "verification", label: "Identity verification", detail: "ok", ok: true },
    { phase: "decision", label: "Authorization decision", detail: "Allow", ok: true },
    { phase: "execution", label: "Execution outcome", detail: "Succeeded", ok: true },
  ],
  denyChain: [
    { phase: "signal", label: "Signal", detail: "request", ok: true },
    { phase: "verification", label: "Identity verification", detail: "ok", ok: true },
    { phase: "decision", label: "Authorization decision", detail: "Deny", ok: false },
    { phase: "execution", label: "Execution outcome", detail: "Denied", ok: false },
  ],
  proof: {
    beforeRevoke: { allowed: true, executionOk: true },
    afterRevoke: { allowed: false, executeStatus: 403 },
  },
};

describe("@acpp/web inspector", () => {
  it("renders signal→decision→outcome chain and revoke proof verdict", () => {
    const html = renderReceiptInspector(sampleProof);
    assert.match(html, /Receipt inspector/);
    assert.match(html, /Revoke-then-deny proof/);
    assert.match(html, /Proof satisfied/);
    assert.match(html, /data-phase="decision"/);
  });

  it("escapes HTML in chain steps", () => {
    const steps = renderChainSteps([
      { phase: "signal", label: "X", detail: "<script>", ok: true },
    ]);
    assert.match(steps, /&lt;script&gt;/);
    assert.doesNotMatch(steps, /<script>/);
  });

  it("includes receipts and dashboard nav links in dashboard shell", () => {
    const page = renderDashboardPage({
      title: "ACPP",
      nav: ["Overview", "Receipts"],
      body: "<p>hi</p>",
      apiBase: "http://127.0.0.1:8787",
    });
    assert.match(page, /href="\/receipts"/);
    assert.match(page, /href="\/dashboard"/);
  });
});
