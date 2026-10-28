import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import type {
  ConnectionStore,
  GrantStore,
  IdentityRegistry,
  ReceiptStore,
  SignalStore,
} from "@acpp/db";
import {
  executeGithubAction,
  githubResource,
  type GithubHttpClient,
} from "@acpp/github";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { hashActionPayload } from "@acpp/policy";
import {
  buildReceipt,
  describeReceiptChain,
  executionOutcomeFromGate,
  executionOutcomeFromGithub,
  type Receipt,
} from "@acpp/receipts";
import { signingMessage } from "@acpp/signals";

export type WedgeProofDeps = {
  registry: IdentityRegistry;
  signals: SignalStore;
  grants: GrantStore;
  connections: ConnectionStore;
  receipts: ReceiptStore;
  githubHttp?: GithubHttpClient;
};

export type WedgeProofResult = {
  workspaceId: string;
  grantId: string;
  signalId: string;
  allowReceipt: Receipt;
  allowChain: ReturnType<typeof describeReceiptChain>;
  denyDecision: { allow: boolean; reason: string };
  denyReceipt: Receipt;
  denyChain: ReturnType<typeof describeReceiptChain>;
  proof: {
    beforeRevoke: { allowed: boolean; executionOk: boolean };
    afterRevoke: { allowed: boolean; executeStatus: number };
  };
};

/**
 * End-to-end wedge: signal → allow → receipt → revoke → deny (PRODUCT §13.1 #8–9).
 */
export async function runWedgeRevokeProof(
  deps: WedgeProofDeps,
): Promise<WedgeProofResult> {
  const repo = "coppergateai/acpp";
  const resource = githubResource(repo);
  const action = "issues.comment" as const;
  const payload = { issueNumber: 1, body: "wedge proof" };

  const ws = deps.registry.workspace.createWorkspace({
    id: `wedge-${Date.now()}`,
    slug: "wedge-proof",
    displayName: "Wedge proof",
  });
  const owner = deps.registry.workspace.registerActor({
    workspaceId: ws.workspaceId,
    actorType: "human",
    id: "owner",
    displayName: "Owner",
  });

  const material = generateEd25519KeyPair();
  const registered = deps.registry.registerIdentity({
    workspaceId: ws.workspaceId,
    actorType: "agent",
    actorId: "WEDGE",
    displayName: "Wedge agent",
    publicKey: material.publicKey,
  });
  const subject = registered.identity.address;
  const keyId = registered.key.keyId;

  const connection = deps.connections.connectGithub({
    workspaceId: ws.workspaceId,
    installationId: "wedge-demo",
    accessToken: "demo-token",
    connectedBy: owner.address,
  });

  const grant = deps.grants.createGrant({
    workspaceId: ws.workspaceId,
    grantedBy: owner.address,
    subject,
    resource,
    action,
  });

  const signalId = `sig_wedge_${Date.now()}`;
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId,
    type: "request",
    sender: subject,
    audience: owner.address,
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: { action, repo, payload },
    auth: { alg: "Ed25519", keyId, signature: "" },
  };
  const signature = signMessage(signingMessage(partial), material.privateKey);
  const envelope: SignalEnvelope = {
    ...partial,
    auth: { alg: "Ed25519", keyId, signature },
  };
  const submitted = deps.signals.submitSignal(envelope);
  if (!submitted.ok) {
    throw new Error(`signal_submit_failed:${submitted.reason}`);
  }

  const decision = deps.grants.evaluateAuthorization({
    workspaceId: ws.workspaceId,
    subject,
    resource,
    action,
  });
  const payloadHash = hashActionPayload(payload);
  const gate = deps.grants.gateProtectedAction(
    { workspaceId: ws.workspaceId, subject, resource, action },
    { payloadHash },
  );
  if (!gate.allowed) {
    throw new Error(`unexpected_gate_deny:${gate.reason}`);
  }

  const token = deps.connections.resolveCredential(connection.credentialRef);
  const execution = await executeGithubAction(
    {
      subject,
      connectionId: connection.connectionId,
      repo,
      action,
      payload,
    },
    true,
    { token, http: deps.githubHttp },
  );

  const allowReceipt = deps.receipts.recordReceipt({
    workspaceId: ws.workspaceId,
    signalId,
    sender: subject,
    verificationOk: true,
    decision,
    execution: executionOutcomeFromGithub(execution),
  });

  deps.grants.revokeGrant(grant.grantId, { workspaceId: ws.workspaceId });

  const denyDecision = deps.grants.evaluateAuthorization({
    workspaceId: ws.workspaceId,
    subject,
    resource,
    action,
  });

  const denyGate = deps.grants.gateProtectedAction(
    { workspaceId: ws.workspaceId, subject, resource, action },
    { payloadHash },
  );
  const denySignalId = `${signalId}_after_revoke`;
  const denyPartial: SignalEnvelope = {
    ...partial,
    signalId: denySignalId,
    createdAt: new Date().toISOString(),
    auth: { alg: "Ed25519", keyId, signature: "" },
  };
  const denySig = signMessage(signingMessage(denyPartial), material.privateKey);
  deps.signals.submitSignal({
    ...denyPartial,
    auth: { alg: "Ed25519", keyId, signature: denySig },
  });

  const denyReceipt = deps.receipts.recordReceipt({
    workspaceId: ws.workspaceId,
    signalId: denySignalId,
    sender: subject,
    verificationOk: true,
    decision: denyDecision,
    execution: executionOutcomeFromGate(denyGate),
  });

  const executeStatus = denyGate.allowed ? 200 : 403;

  return {
    workspaceId: ws.workspaceId,
    grantId: grant.grantId,
    signalId,
    allowReceipt,
    allowChain: describeReceiptChain(allowReceipt, {
      type: envelope.type,
    }),
    denyDecision: { allow: denyDecision.allow, reason: denyDecision.reason },
    denyReceipt,
    denyChain: describeReceiptChain(denyReceipt, { type: "request" }),
    proof: {
      beforeRevoke: { allowed: decision.allow, executionOk: execution.ok },
      afterRevoke: { allowed: denyDecision.allow, executeStatus },
    },
  };
}

/** For tests that need a static receipt shape without full HTTP stack. */
export function summarizeWedgeProof(result: WedgeProofResult): {
  beforeRevoke: boolean;
  afterRevoke: boolean;
} {
  return {
    beforeRevoke:
      result.proof.beforeRevoke.allowed && result.proof.beforeRevoke.executionOk,
    afterRevoke: !result.proof.afterRevoke.allowed,
  };
}
