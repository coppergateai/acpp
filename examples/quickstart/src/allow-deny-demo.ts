/**
 * PRODUCT §17.1 — reproducible allow then policy denial over the hosted API.
 */
import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { signingMessage } from "@acpp/signals";

export type AllowDenyDemoResult = {
  mode: "compact" | "explicit";
  workspaceId: string;
  allowed: boolean;
  denied: boolean;
  allowReceiptId?: string;
  denyReceiptId?: string;
};

export type WedgeProofResponse = {
  workspaceId: string;
  allowReceipt: { receiptId: string };
  denyReceipt: { receiptId: string };
  proof: {
    beforeRevoke: { allowed: boolean; executionOk: boolean };
    afterRevoke: { allowed: boolean; executeStatus: number };
  };
};

async function jsonOrThrow(res: Response, step: string): Promise<unknown> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${step}: HTTP ${res.status} ${text}`);
  }
  return res.json() as Promise<unknown>;
}

/**
 * One-shot demo via `POST /v1/demo/wedge-revoke-proof` (signal → allow → receipt → revoke → deny).
 */
export async function runCompactAllowDenyDemo(
  baseUrl: string,
): Promise<AllowDenyDemoResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/demo/wedge-revoke-proof`, {
    method: "POST",
  });
  const body = (await jsonOrThrow(res, "wedge-revoke-proof")) as WedgeProofResponse;
  const allowed =
    body.proof.beforeRevoke.allowed && body.proof.beforeRevoke.executionOk;
  const denied =
    !body.proof.afterRevoke.allowed && body.proof.afterRevoke.executeStatus === 403;
  if (!allowed || !denied) {
    throw new Error(
      `demo_incomplete: allowed=${allowed} denied=${denied} ${JSON.stringify(body.proof)}`,
    );
  }
  return {
    mode: "compact",
    workspaceId: body.workspaceId,
    allowed: true,
    denied: true,
    allowReceiptId: body.allowReceipt.receiptId,
    denyReceiptId: body.denyReceipt.receiptId,
  };
}

/**
 * Step-by-step HTTP quickstart (workspace → identity → signal → evaluate → execute → revoke → deny).
 */
export async function runExplicitAllowDenyDemo(
  baseUrl: string,
): Promise<AllowDenyDemoResult> {
  const base = baseUrl.replace(/\/$/, "");
  const repo = "coppergateai/acpp";
  const resource = `github:repo:${repo}`;
  const action = "issues.comment";
  const payload = { issueNumber: 1, body: "quickstart allow/deny demo" };

  const wsRes = await fetch(`${base}/v1/workspaces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "quickstart-demo",
      slug: "quickstart-demo",
      displayName: "Quickstart demo",
    }),
  });
  const wsBody = (await jsonOrThrow(wsRes, "create_workspace")) as {
    workspace: { workspaceId: string };
  };
  const workspaceId = wsBody.workspace.workspaceId;

  const ownerKeys = generateEd25519KeyPair();
  const ownerReg = await fetch(`${base}/v1/workspaces/${workspaceId}/identities`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actorType: "human",
      actorId: "owner",
      displayName: "Owner",
      publicKey: ownerKeys.publicKey,
    }),
  });
  const ownerBody = (await jsonOrThrow(ownerReg, "register_owner")) as {
    identity: { address: string };
  };
  const grantedBy = ownerBody.identity.address;

  const agentKeys = generateEd25519KeyPair();
  const agentReg = await fetch(`${base}/v1/workspaces/${workspaceId}/identities`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actorType: "agent",
      actorId: "QUICKSTART",
      displayName: "Quickstart agent",
      publicKey: agentKeys.publicKey,
    }),
  });
  const agentBody = (await jsonOrThrow(agentReg, "register_agent")) as {
    identity: { address: string };
    key: { keyId: string };
  };
  const subject = agentBody.identity.address;
  const keyId = agentBody.key.keyId;

  const connect = await fetch(`${base}/v1/workspaces/${workspaceId}/connections/github`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      installationId: "quickstart-local",
      accessToken: "demo-token",
    }),
  });
  const connectBody = (await jsonOrThrow(connect, "connect_github")) as {
    connection: { connectionId: string };
  };
  const connectionId = connectBody.connection.connectionId;

  const grantRes = await fetch(`${base}/v1/grants`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      grantedBy,
      subject,
      resource,
      action,
    }),
  });
  const grantBody = (await jsonOrThrow(grantRes, "create_grant")) as {
    grant: { grantId: string };
  };
  const grantId = grantBody.grant.grantId;

  const signalId = "sig_quickstart_allow_deny";
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId,
    type: "request",
    sender: subject as SignalEnvelope["sender"],
    audience: grantedBy as SignalEnvelope["audience"],
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: { action, repo, payload },
    auth: { alg: "Ed25519", keyId, signature: "" },
  };
  const signature = signMessage(signingMessage(partial), agentKeys.privateKey);
  const envelope: SignalEnvelope = {
    ...partial,
    auth: { alg: "Ed25519", keyId, signature },
  };

  const signalSubmit = await fetch(`${base}/v1/signals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(envelope),
  });
  await jsonOrThrow(signalSubmit, "submit_signal");

  const verify = await fetch(`${base}/v1/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      address: subject,
      keyId,
      message: signingMessage(partial),
      signature,
    }),
  });
  const verifyBody = (await jsonOrThrow(verify, "verify_signal")) as { ok: boolean };
  if (!verifyBody.ok) {
    throw new Error("verify_signal: signature rejected");
  }

  const allowEval = await fetch(`${base}/v1/authorization/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, subject, resource, action }),
  });
  const allowDecision = (await jsonOrThrow(allowEval, "evaluate_allow")) as {
    decision: { allow: boolean };
  };
  if (!allowDecision.decision.allow) {
    throw new Error("evaluate_allow: expected allow before revoke");
  }

  const allowExec = await fetch(`${base}/v1/github/actions/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      connectionId,
      subject,
      repo,
      action,
      payload,
      signalId,
    }),
  });
  const allowExecBody = (await jsonOrThrow(allowExec, "execute_allow")) as {
    execution: { ok: boolean };
    receipt?: { receiptId: string };
  };
  if (!allowExecBody.execution.ok) {
    throw new Error("execute_allow: GitHub stub execution failed");
  }

  const revoke = await fetch(`${base}/v1/grants/${grantId}/revoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId }),
  });
  await jsonOrThrow(revoke, "revoke_grant");

  const denyEval = await fetch(`${base}/v1/authorization/evaluate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, subject, resource, action }),
  });
  const denyDecision = (await jsonOrThrow(denyEval, "evaluate_deny")) as {
    decision: { allow: boolean };
  };
  if (denyDecision.decision.allow) {
    throw new Error("evaluate_deny: expected deny after revoke");
  }

  const denyExec = await fetch(`${base}/v1/github/actions/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      connectionId,
      subject,
      repo,
      action,
      payload,
    }),
  });
  if (denyExec.status !== 403) {
    const text = await denyExec.text();
    throw new Error(`execute_deny: expected 403 got ${denyExec.status} ${text}`);
  }
  const denyExecBody = (await denyExec.json()) as {
    receipt?: { receiptId: string };
  };

  return {
    mode: "explicit",
    workspaceId,
    allowed: true,
    denied: true,
    allowReceiptId: allowExecBody.receipt?.receiptId,
    denyReceiptId: denyExecBody.receipt?.receiptId,
  };
}
