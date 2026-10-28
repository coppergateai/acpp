import type { ActorAddress } from "@acpp/core";

/**
 * Ordered gateway pipeline from PRODUCT §10.5.
 * ACPP governs identity and policy; MCP carries tool execution.
 */
export const MCP_GATEWAY_PIPELINE = [
  "authenticate_actor",
  "resolve_connection",
  "check_authorization",
  "validate_tool_and_args",
  "apply_rate_limits_and_approval",
  "execute_via_connection",
  "record_request_and_outcome",
  "return_sanitized_result",
] as const;

export type McpGatewayStep = (typeof MCP_GATEWAY_PIPELINE)[number];

/** Workspace MCP connection metadata — credentials stay server-side (PRODUCT §10.3). */
export type McpConnection = {
  connectionId: string;
  workspaceId: string;
  /** Registered MCP server endpoint (validated at connect time). */
  serverUrl: string;
  credentialRef: string;
  /** Tool names exposed by the server that operators allow on this connection. */
  allowedTools: readonly string[];
  createdAt: string;
};

export type McpToolInvokeRequest = {
  subject: ActorAddress;
  workspaceId: string;
  connectionId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
};

export function mcpResource(connectionId: string, toolName: string): string {
  return `mcp:connection:${connectionId}:tool:${toolName}`;
}

export type McpGatewayPrecheckInput = {
  authenticated: boolean;
  connectionFound: boolean;
  authorized: boolean;
  toolAllowed: boolean;
  argumentsValid: boolean;
  withinRateLimit: boolean;
  approvalSatisfied: boolean;
};

export type McpGatewayPrecheckResult = {
  proceedToExecution: boolean;
  blockedAt: McpGatewayStep | null;
  reason: string;
};

const PRECHECK_BY_STEP: Array<{
  step: McpGatewayStep;
  key: keyof McpGatewayPrecheckInput;
  reason: string;
}> = [
  { step: "authenticate_actor", key: "authenticated", reason: "caller_not_authenticated" },
  { step: "resolve_connection", key: "connectionFound", reason: "connection_not_found" },
  { step: "check_authorization", key: "authorized", reason: "policy_denied" },
  { step: "validate_tool_and_args", key: "toolAllowed", reason: "tool_not_allowed" },
  {
    step: "validate_tool_and_args",
    key: "argumentsValid",
    reason: "invalid_tool_arguments",
  },
  {
    step: "apply_rate_limits_and_approval",
    key: "withinRateLimit",
    reason: "rate_limit_exceeded",
  },
  {
    step: "apply_rate_limits_and_approval",
    key: "approvalSatisfied",
    reason: "approval_required_or_stale",
  },
];

/**
 * Deterministic pre-execution gate for the MCP gateway sketch.
 * Steps 6–8 run only after policy and safety checks pass.
 */
export function evaluateMcpGatewayPrecheck(
  input: McpGatewayPrecheckInput,
): McpGatewayPrecheckResult {
  for (const rule of PRECHECK_BY_STEP) {
    if (!input[rule.key]) {
      return {
        proceedToExecution: false,
        blockedAt: rule.step,
        reason: rule.reason,
      };
    }
  }
  return {
    proceedToExecution: true,
    blockedAt: null,
    reason: "ready_for_execution",
  };
}
