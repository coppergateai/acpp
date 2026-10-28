/**
 * HTTP quickstart walkthrough (PRODUCT §17.1) using `@acpp/client` against `@acpp/api`.
 */
import type { SignalEnvelope } from "@acpp/core";
import { githubResource } from "@acpp/github";
import { generateEd25519KeyPair, signMessage } from "@acpp/identity";
import { AcppClient, signSignalEnvelope } from "@acpp/client";

export type WalkthroughOptions = {
  baseUrl: string;
};

export type WalkthroughResult = {
  workspaceId: string;
  agentAddress: string;
  allowedBeforeRevoke: boolean;
  githubExecuted: boolean;
  deniedAfterRevoke: boolean;
};

export async function runHttpWalkthrough(
  options: WalkthroughOptions,
): Promise<WalkthroughResult> {
  const client = new AcppClient({ baseUrl: options.baseUrl });
  const { workspace } = await client.createWorkspace({
    id: "wedge",
    slug: "wedge-github",
    displayName: "Wedge GitHub",
  });
  const agentMaterial = generateEd25519KeyPair();
  const ownerMaterial = generateEd25519KeyPair();
  const owner = await client.registerIdentity(workspace.workspaceId, {
    actorType: "human",
    actorId: "01OWNER",
    displayName: "Workspace owner",
    publicKey: ownerMaterial.publicKey,
  });
  const agent = await client.registerIdentity(workspace.workspaceId, {
    actorType: "agent",
    actorId: "01WEDGE",
    displayName: "Wedge agent",
    publicKey: agentMaterial.publicKey,
  });
  const challenge = "wedge-quickstart";
  const signature = signMessage(challenge, agentMaterial.privateKey);
  const verified = await client.verifySignature({
    address: agent.identity.address,
    keyId: agent.key.keyId,
    message: challenge,
    signature,
  });
  if (!verified.ok) {
    throw new Error("agent verification failed");
  }

  const signalId = "sig_wedge_http_1";
  const envelope = signSignalEnvelope({
    material: agentMaterial,
    keyId: agent.key.keyId,
    sender: agent.identity.address as SignalEnvelope["sender"],
    signalId,
    payload: { action: "issues.comment", repo: "coppergateai/acpp" },
  });
  await client.submitSignal(envelope);

  const resource = githubResource("coppergateai/acpp");
  const action = "issues.comment";
  const { grant } = await client.createGrant({
    workspaceId: workspace.workspaceId,
    grantedBy: owner.identity.address,
    subject: agent.identity.address,
    resource,
    action,
  });
  const before = await client.evaluateAuthorization({
    workspaceId: workspace.workspaceId,
    subject: agent.identity.address,
    resource,
    action,
  });

  const { connection } = await client.connectGithub(workspace.workspaceId, {
    installationId: "9001",
    accessToken: "ghs_wedge",
  });
  const exec = await client.executeGithubAction({
    workspaceId: workspace.workspaceId,
    connectionId: connection.connectionId,
    subject: agent.identity.address,
    repo: "coppergateai/acpp",
    action,
    payload: { issueNumber: 1, body: "wedge quickstart" },
    signalId,
  });

  await client.revokeGrant(grant.grantId, { workspaceId: workspace.workspaceId });
  const after = await client.evaluateAuthorization({
    workspaceId: workspace.workspaceId,
    subject: agent.identity.address,
    resource,
    action,
  });

  return {
    workspaceId: workspace.workspaceId,
    agentAddress: agent.identity.address,
    allowedBeforeRevoke: before.decision.allow,
    githubExecuted: exec.gate.allowed && (exec.execution?.ok ?? false),
    deniedAfterRevoke: !after.decision.allow,
  };
}
