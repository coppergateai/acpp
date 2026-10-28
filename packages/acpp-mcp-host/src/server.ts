import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AcppHostConfig } from "./config.js";
import { AcppGatewayClient } from "./gateway-client.js";
import {
  discoverHostTools,
  handleHostToolCall,
  type HostToolDescriptor,
} from "./tools.js";

export type AcppHostRuntime = {
  server: McpServer;
  client: AcppGatewayClient;
  config: AcppHostConfig;
  descriptors: HostToolDescriptor[];
};

/**
 * Build the Cursor/Claude-facing MCP server that proxies through ACPP (A-030).
 */
export async function createAcppHostServer(
  config: AcppHostConfig,
): Promise<AcppHostRuntime> {
  const client = new AcppGatewayClient({ baseUrl: config.apiUrl });
  const descriptors = await discoverHostTools(client, config);

  const server = new McpServer({
    name: "acpp",
    version: "0.1.0",
  });

  const run = async (name: string, args: Record<string, unknown>) =>
    handleHostToolCall({ name, args, client, config, descriptors });

  server.registerTool(
    "acpp_whoami",
    {
      title: "ACPP whoami",
      description:
        "Show the ACPP actor/workspace this session is bound to (discovery ≠ consent).",
      inputSchema: {},
    },
    async () => run("acpp_whoami", {}),
  );

  server.registerTool(
    "acpp_list_capabilities",
    {
      title: "ACPP list capabilities",
      description:
        "List policy-permitted capabilities for the bound agent (PRODUCT §10.4).",
      inputSchema: {},
    },
    async () => run("acpp_list_capabilities", {}),
  );

  server.registerTool(
    "acpp_evaluate_authorization",
    {
      title: "ACPP evaluate authorization",
      description:
        "Evaluate whether the bound agent is allowed a resource+action (no execution).",
      inputSchema: {
        resource: z.string().describe("Resource id, e.g. mcp:connection:…:tool:echo"),
        action: z.string().describe("Action id, e.g. mcp.tools.call"),
      },
    },
    async (args) => run("acpp_evaluate_authorization", args),
  );

  if (config.mcpConnectionId) {
    server.registerTool(
      "acpp_mcp_invoke",
      {
        title: "ACPP MCP invoke",
        description:
          "Invoke a remote MCP tool through the ACPP gateway (identity → grant → receipt).",
        inputSchema: {
          toolName: z.string(),
          arguments: z.record(z.unknown()).optional(),
          approvalId: z.string().optional(),
        },
      },
      async (args) => run("acpp_mcp_invoke", args as Record<string, unknown>),
    );
  }

  if (config.githubConnectionId) {
    server.registerTool(
      "acpp_github_action",
      {
        title: "ACPP GitHub action",
        description:
          "Execute a GitHub protected action via ACPP. Policy-gated.",
        inputSchema: {
          repo: z.string(),
          action: z.enum(["issues.comment", "repos.metadata.read"]),
          payload: z.record(z.unknown()).optional(),
          approvalId: z.string().optional(),
        },
      },
      async (args) => run("acpp_github_action", args as Record<string, unknown>),
    );
  }

  for (const descriptor of descriptors) {
    if (descriptor.kind !== "mcp" || !descriptor.mcpToolName) continue;
    server.registerTool(
      descriptor.name,
      {
        title: descriptor.mcpToolName,
        description: descriptor.description,
        inputSchema: {
          message: z.string().optional(),
          arguments: z.record(z.unknown()).optional(),
        },
      },
      async (args) => run(descriptor.name, args as Record<string, unknown>),
    );
  }

  return { server, client, config, descriptors };
}
