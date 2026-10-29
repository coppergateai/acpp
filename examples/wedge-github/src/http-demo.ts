/**
 * Hosted wedge walkthrough against `@acpp/api` (A-010).
 * Same invariants as WEDGE.md / docs/QUICKSTART.md compact proof.
 */
export type WedgeHttpDemoResult = {
  workspaceId: string;
  allowed: boolean;
  denied: boolean;
  allowReceiptId: string;
  denyReceiptId: string;
};

type WedgeProofResponse = {
  workspaceId: string;
  allowReceipt: { receiptId: string };
  denyReceipt: { receiptId: string };
  proof: {
    beforeRevoke: { allowed: boolean; executionOk: boolean };
    afterRevoke: { allowed: boolean; executeStatus: number };
  };
};

/**
 * Call `POST /v1/demo/wedge-revoke-proof` on a running (or ephemeral) API.
 */
export async function runWedgeHttpDemo(baseUrl: string): Promise<WedgeHttpDemoResult> {
  const base = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/demo/wedge-revoke-proof`, { method: "POST" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`wedge-revoke-proof: HTTP ${res.status} ${text}`);
  }
  const body = JSON.parse(text) as WedgeProofResponse;
  const allowed =
    body.proof.beforeRevoke.allowed && body.proof.beforeRevoke.executionOk;
  const denied =
    !body.proof.afterRevoke.allowed && body.proof.afterRevoke.executeStatus === 403;
  if (!allowed || !denied) {
    throw new Error(
      `wedge_incomplete: allowed=${allowed} denied=${denied} ${JSON.stringify(body.proof)}`,
    );
  }
  return {
    workspaceId: body.workspaceId,
    allowed: true,
    denied: true,
    allowReceiptId: body.allowReceipt.receiptId,
    denyReceiptId: body.denyReceipt.receiptId,
  };
}
