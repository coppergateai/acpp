import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConnectionStore,
  GrantStore,
  IdentityRegistry,
  ReceiptStore,
  SignalStore,
} from "@acpp/db";
import { runWedgeRevokeProof, summarizeWedgeProof } from "./wedge-proof.ts";

describe("wedge revoke proof", () => {
  it("records allow receipt then deny after revoke", async () => {
    const registry = new IdentityRegistry();
    const workspace = registry.workspace;
    const signals = new SignalStore(registry);
    const grants = new GrantStore(workspace);
    const connections = new ConnectionStore(workspace);
    const receipts = new ReceiptStore(workspace);

    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/issues/") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: 1 }), { status: 201 });
      }
      return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
        status: 200,
      });
    };

    const result = await runWedgeRevokeProof({
      registry,
      signals,
      grants,
      connections,
      receipts,
      githubHttp: { fetch: mockFetch },
    });

    const summary = summarizeWedgeProof(result);
    assert.equal(summary.beforeRevoke, true);
    assert.equal(summary.afterRevoke, true);
    assert.equal(result.allowChain.length, 4);
    assert.equal(result.denyChain[2]!.ok, false);

    const listed = receipts.listReceipts({ workspaceId: result.workspaceId });
    assert.equal(listed.length, 2);
  });
});
