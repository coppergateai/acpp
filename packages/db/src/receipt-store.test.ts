import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ReceiptStore } from "./receipt-store.js";

describe("ReceiptStore", () => {
  it("records receipt and resolves by id and signalId within tenant", () => {
    const store = new ReceiptStore();
    const ws = store.workspace.createWorkspace({
      id: "rcpt",
      slug: "rcpt",
      displayName: "Receipts",
    });
    const agent = store.workspace.registerActor({
      workspaceId: ws.workspaceId,
      actorType: "agent",
      id: "a1",
      displayName: "Agent",
    });

    const recorded = store.recordReceipt({
      workspaceId: ws.workspaceId,
      signalId: "sig_01",
      sender: agent.address,
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

    const byId = store.getReceipt(recorded.receiptId, ws.workspaceId);
    assert.ok(byId);
    assert.equal(byId.signalId, "sig_01");

    const bySignal = store.getReceiptBySignalId("sig_01", ws.workspaceId);
    assert.equal(bySignal?.receiptId, recorded.receiptId);

    const list = store.listReceipts({ workspaceId: ws.workspaceId });
    assert.equal(list.length, 1);
  });

  it("isolates receipts by workspace", () => {
    const store = new ReceiptStore();
    const wsA = store.workspace.createWorkspace({
      id: "a",
      slug: "a",
      displayName: "A",
    });
    const wsB = store.workspace.createWorkspace({
      id: "b",
      slug: "b",
      displayName: "B",
    });
    const agent = store.workspace.registerActor({
      workspaceId: wsA.workspaceId,
      actorType: "agent",
      id: "x",
      displayName: "X",
    });

    const recorded = store.recordReceipt({
      workspaceId: wsA.workspaceId,
      signalId: "sig_iso",
      sender: agent.address,
      verificationOk: true,
      decision: {
        decisionId: "d1",
        allow: true,
        reason: "grant_match",
        requiresApproval: false,
        evaluatedAt: "2026-01-01T00:00:00.000Z",
      },
      execution: { status: "denied", reason: "revoked" },
    });

    assert.equal(store.getReceipt(recorded.receiptId, wsB.workspaceId), undefined);
    assert.equal(
      store.getReceiptBySignalId("sig_iso", wsB.workspaceId),
      undefined,
    );
  });
});
