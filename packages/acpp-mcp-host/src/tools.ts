import { mcpResource } from "@acpp/mcp";
import type { AcppHostConfig } from "./config.js";
import {
  AcppGatewayClient,
  type PermittedCapability,
} from "./gateway-client.js";

export type HostToolDescriptor = {
  name: string;
  description: string;
  kind: "meta" | "mcp" | "github";
  mcpToolName?: string;
};

function textResult(payload: unknown, isError = false) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent:
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : { value: payload },
    isError,
  };
}

export function sanitizeMcpToolName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return `mcp_${cleaned || "tool"}`;
}

export async function discoverHostTools(
  client: AcppGatewayClient,
  config: AcppHostConfig,
): Promise<HostToolDescriptor[]> {
  const tools: HostToolDescriptor[] = [
    {
      name: "acpp_whoami",
      description:
        "Show the ACPP actor/workspace this Cursor/Claude session is bound to (discovery ≠ consent).",
      kind: "meta",
    },
    {
      name: "acpp_list_capabilities",
      description:
        "List policy-permitted capabilities for the bound agent (PRODUCT §10.4).",
      kind: "meta",
    },
    {
      name: "acpp_evaluate_authorization",
      description:
        "Evaluate whether the bound agent is allowed a resource+action (no execution).",
      kind: "meta",
    },
  ];

  if (config.githubConnectionId) {
    tools.push({
      name: "acpp_github_action",
      description:
        "Execute a GitHub protected action via ACPP (issues.comment | repos.metadata.read). Policy-gated.",
      kind: "github",
    });
  }

  if (config.mcpConnectionId) {
    tools.push({
      name: "acpp_mcp_invoke",
      description:
        "Invoke a remote MCP tool through the ACPP gateway (identity → grant → receipt path).",
      kind: "meta",
    });

    const caps = await client.listMcpCapabilities({
      workspaceId: config.workspaceId,
      subject: config.subject,
      connectionId: config.mcpConnectionId,
    });
    if (caps.ok) {
      for (const tool of caps.data.tools) {
        tools.push({
          name: sanitizeMcpToolName(tool.name),
          description: `ACPP-governed MCP tool "${tool.name}" (policy-permitted only).`,
          kind: "mcp",
          mcpToolName: tool.name,
        });
      }
    }
  }

  return tools;
}

export async function handleHostToolCall(input: {
  name: string;
  args: Record<string, unknown>;
  client: AcppGatewayClient;
  config: AcppHostConfig;
  descriptors: HostToolDescriptor[];
}) {
  const { name, args, client, config, descriptors } = input;

  if (name === "acpp_whoami") {
    return textResult({
      workspaceId: config.workspaceId,
      subject: config.subject,
      apiUrl: client.base,
      mcpConnectionId: config.mcpConnectionId ?? null,
      githubConnectionId: config.githubConnectionId ?? null,
      discoveryIsNotConsent: true,
    });
  }

  if (name === "acpp_list_capabilities") {
    const result = await client.listIdentityCapabilities(config.subject, {
      workspaceId: config.workspaceId,
      requester: config.subject,
    });
    if (!result.ok) {
      return textResult(
        { error: "capabilities_failed", detail: result.error },
        true,
      );
    }
    return textResult(result.data);
  }

  if (name === "acpp_evaluate_authorization") {
    const resource = String(args.resource ?? "");
    const action = String(args.action ?? "");
    if (!resource || !action) {
      return textResult({ error: "resource_and_action_required" }, true);
    }
    const result = await client.evaluateAuthorization({
      workspaceId: config.workspaceId,
      subject: config.subject,
      resource,
      action,
    });
    if (!result.ok) {
      return textResult({ error: "evaluate_failed", detail: result.error }, true);
    }
    return textResult(result.data);
  }

  if (name === "acpp_mcp_invoke") {
    if (!config.mcpConnectionId) {
      return textResult({ error: "mcp_connection_not_configured" }, true);
    }
    const toolName = String(args.toolName ?? "");
    if (!toolName) {
      return textResult({ error: "toolName_required" }, true);
    }
    const toolArgs =
      args.arguments && typeof args.arguments === "object"
        ? (args.arguments as Record<string, unknown>)
        : {};
    const result = await client.invokeMcpTool({
      workspaceId: config.workspaceId,
      connectionId: config.mcpConnectionId,
      subject: config.subject,
      toolName,
      arguments: toolArgs,
      approvalId:
        typeof args.approvalId === "string" ? args.approvalId : undefined,
    });
    if (!result.ok) {
      return textResult(
        { error: "mcp_invoke_denied_or_failed", status: result.status, detail: result.error },
        true,
      );
    }
    return textResult(result.data);
  }

  if (name === "acpp_github_action") {
    if (!config.githubConnectionId) {
      return textResult({ error: "github_connection_not_configured" }, true);
    }
    const repo = String(args.repo ?? "");
    const action = String(args.action ?? "");
    if (
      !repo ||
      (action !== "issues.comment" && action !== "repos.metadata.read")
    ) {
      return textResult(
        { error: "repo_and_valid_action_required" },
        true,
      );
    }
    const payload =
      args.payload && typeof args.payload === "object"
        ? (args.payload as Record<string, unknown>)
        : action === "repos.metadata.read"
          ? {}
          : undefined;
    if (payload === undefined) {
      return textResult({ error: "payload_required_for_action" }, true);
    }
    const result = await client.executeGithubAction({
      workspaceId: config.workspaceId,
      connectionId: config.githubConnectionId,
      subject: config.subject,
      repo,
      action,
      payload,
      approvalId:
        typeof args.approvalId === "string" ? args.approvalId : undefined,
    });
    if (!result.ok) {
      return textResult(
        {
          error: "github_action_denied_or_failed",
          status: result.status,
          detail: result.error,
        },
        true,
      );
    }
    return textResult(result.data);
  }

  const dynamic = descriptors.find((d) => d.name === name && d.kind === "mcp");
  if (dynamic?.mcpToolName) {
    if (!config.mcpConnectionId) {
      return textResult({ error: "mcp_connection_not_configured" }, true);
    }
    const toolArgs =
      args.arguments && typeof args.arguments === "object"
        ? (args.arguments as Record<string, unknown>)
        : args.message !== undefined
          ? { message: args.message }
          : {};
    const result = await client.invokeMcpTool({
      workspaceId: config.workspaceId,
      connectionId: config.mcpConnectionId,
      subject: config.subject,
      toolName: dynamic.mcpToolName,
      arguments: toolArgs,
    });
    if (!result.ok) {
      return textResult(
        {
          error: "mcp_invoke_denied_or_failed",
          status: result.status,
          resource: mcpResource(config.mcpConnectionId, dynamic.mcpToolName),
          detail: result.error,
        },
        true,
      );
    }
    return textResult(result.data);
  }

  return textResult({ error: "unknown_tool", name }, true);
}

/** Helpers for tests — map grant rows into expected MCP tool names. */
export function mcpToolNamesFromCapabilities(
  capabilities: PermittedCapability[],
  connectionId: string,
): string[] {
  const prefix = `mcp:connection:${connectionId}:tool:`;
  return capabilities
    .filter((c) => c.provider === "mcp" && c.resource.startsWith(prefix))
    .map((c) => c.resource.slice(prefix.length));
}
