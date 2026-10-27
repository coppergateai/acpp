/**
 * Wedge sketch: identity → grant → GitHub action → receipt → revoke → deny.
 * Full HTTP/GitHub wiring lands with P-020 / A-010.
 */
import { createActorAddress } from "@acpp/core";
import { executeGithubAction, githubResource } from "@acpp/github";
import { evaluateGrant, type PermissionGrant } from "@acpp/policy";
import { buildReceipt } from "@acpp/receipts";

export async function runWedgeSketch(): Promise<{
  beforeRevoke: boolean;
  afterRevoke: boolean;
}> {
  const agent = createActorAddress("agent", "01JWEDGE");
  const resource = githubResource("coppergateai/acpp");
  const action = "issues.comment" as const;

  const grants: PermissionGrant[] = [
    {
      grantId: "g_wedge",
      subject: agent,
      resource,
      action,
      requiresApproval: false,
    },
  ];

  const allowed = evaluateGrant(grants, { subject: agent, resource, action });
  const exec = await executeGithubAction(
    {
      subject: agent,
      connectionId: "conn_stub",
      repo: "coppergateai/acpp",
      action,
    },
    allowed.allow,
  );

  buildReceipt({
    receiptId: "rcpt_wedge_1",
    signalId: "sig_wedge_1",
    sender: agent,
    verificationOk: true,
    decision: allowed,
    execution: exec.ok
      ? { status: "succeeded", externalRef: exec.externalRef }
      : { status: "failed", error: exec.error ?? "failed" },
  });

  grants[0] = {
    ...grants[0]!,
    revokedAt: new Date().toISOString(),
  };
  const denied = evaluateGrant(grants, { subject: agent, resource, action });

  return { beforeRevoke: allowed.allow && exec.ok, afterRevoke: denied.allow };
}
