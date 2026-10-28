/**
 * Seed workspace + agent + MCP connection + grant for host-adapter dogfood.
 */
import { generateEd25519KeyPair } from "@acpp/identity";
import { mcpResource } from "@acpp/mcp";
import { AcppGatewayClient } from "./gateway-client.js";
import { startMockMcpServer, type MockMcpHandle } from "./mock-mcp-server.js";

export type BootstrapResult = {
  apiUrl: string;
  workspaceId: string;
  ownerAddress: string;
  subject: string;
  mcpConnectionId: string;
  mockTool: string;
  mock: MockMcpHandle;
};

export async function bootstrapHostDemo(input: {
  apiUrl: string;
  workspaceSuffix?: string;
  mockTool?: string;
}): Promise<BootstrapResult> {
  const client = new AcppGatewayClient({ baseUrl: input.apiUrl });
  const suffix =
    input.workspaceSuffix ??
    `mcp-host-${Date.now().toString(36)}`;
  const mockTool = input.mockTool ?? "echo";

  const mock = await startMockMcpServer([mockTool]);

  const ws = await client.createWorkspace({
    id: suffix,
    slug: suffix,
    displayName: "ACPP MCP host demo",
  });
  if (!ws.ok) {
    await mock.close();
    throw new Error(`bootstrap_workspace_failed:${JSON.stringify(ws.error)}`);
  }
  const workspaceId = ws.data.workspace.workspaceId;

  const ownerKeys = generateEd25519KeyPair();
  const owner = await client.registerIdentity(workspaceId, {
    actorType: "human",
    actorId: "owner",
    displayName: "Host owner",
    publicKey: ownerKeys.publicKey,
  });
  if (!owner.ok) {
    await mock.close();
    throw new Error(`bootstrap_owner_failed:${JSON.stringify(owner.error)}`);
  }

  const agentKeys = generateEd25519KeyPair();
  const agent = await client.registerIdentity(workspaceId, {
    actorType: "agent",
    actorId: "cursor-host",
    displayName: "Cursor host agent",
    publicKey: agentKeys.publicKey,
  });
  if (!agent.ok) {
    await mock.close();
    throw new Error(`bootstrap_agent_failed:${JSON.stringify(agent.error)}`);
  }

  const conn = await client.connectMcp(workspaceId, {
    serverUrl: mock.url,
    allowedTools: [mockTool],
  });
  if (!conn.ok) {
    await mock.close();
    throw new Error(`bootstrap_mcp_connect_failed:${JSON.stringify(conn.error)}`);
  }
  const mcpConnectionId = conn.data.connection.connectionId;
  const subject = agent.data.identity.address;
  const resource = mcpResource(mcpConnectionId, mockTool);

  const grant = await client.createGrant({
    workspaceId,
    grantedBy: owner.data.identity.address,
    subject,
    resource,
    action: "mcp.tools.call",
    requiresApproval: false,
  });
  if (!grant.ok) {
    await mock.close();
    throw new Error(`bootstrap_grant_failed:${JSON.stringify(grant.error)}`);
  }

  return {
    apiUrl: input.apiUrl,
    workspaceId,
    ownerAddress: owner.data.identity.address,
    subject,
    mcpConnectionId,
    mockTool,
    mock,
  };
}
