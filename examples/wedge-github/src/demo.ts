/**
 * Wedge sketch: identity → grant → GitHub action → receipt → revoke → deny.
 * Uses injectable HTTP for offline tests; hosted flow: `docs/protocol/connections.md`.
 */
import { createActorAddress } from "@acpp/core";
import {
  executeGithubAction,
  githubResource,
  type GithubHttpClient,
} from "@acpp/github";
import { evaluateGrant, type PermissionGrant } from "@acpp/policy";
import { buildReceipt } from "@acpp/receipts";

export type WedgeSketchOptions = {
  githubHttp?: GithubHttpClient;
  connectionToken?: string;
};

export async function runWedgeSketch(
  options: WedgeSketchOptions = {},
): Promise<{
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
  const githubHttp =
    options.githubHttp ??
    ({
      fetch: async (input, init) => {
        const url = String(input);
        if (url.includes("/issues/") && init?.method === "POST") {
          return new Response(JSON.stringify({ id: 1, html_url: "https://example.test/1" }), {
            status: 201,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    } satisfies GithubHttpClient);
  const exec = await executeGithubAction(
    {
      subject: agent,
      connectionId: "conn_stub",
      repo: "coppergateai/acpp",
      action,
      payload: { issueNumber: 1, body: "wedge" },
    },
    allowed.allow,
    { token: options.connectionToken ?? "test-token", http: githubHttp },
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
