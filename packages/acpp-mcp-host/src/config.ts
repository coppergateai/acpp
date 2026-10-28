import { isActorAddress } from "@acpp/core";

export type AcppHostConfig = {
  /** Hosted ACPP API base URL (required unless embedded). */
  apiUrl: string;
  workspaceId: string;
  /** Agent actor that Cursor/Claude acts as. */
  subject: string;
  /** Optional MCP connection for policy-gated remote tools. */
  mcpConnectionId?: string;
  /** Optional GitHub connection for wedge actions. */
  githubConnectionId?: string;
  /** When true, host starts in-process API + demo mock MCP. */
  embedded: boolean;
};

export function loadHostConfig(
  env: NodeJS.ProcessEnv = process.env,
): AcppHostConfig {
  const embedded =
    env.ACPP_EMBEDDED === "1" ||
    env.ACPP_EMBEDDED === "true" ||
    (!env.ACPP_API_URL && env.ACPP_EMBEDDED !== "0");

  const apiUrl = (env.ACPP_API_URL ?? "http://127.0.0.1:8787").replace(
    /\/$/,
    "",
  );
  const workspaceId = env.ACPP_WORKSPACE_ID ?? "";
  const subject = env.ACPP_SUBJECT ?? "";

  if (!embedded) {
    if (!workspaceId || !/^ws_[A-Za-z0-9_-]+$/.test(workspaceId)) {
      throw new Error(
        "ACPP_WORKSPACE_ID is required (ws_…) when ACPP_EMBEDDED is off",
      );
    }
    if (!subject || !isActorAddress(subject)) {
      throw new Error("ACPP_SUBJECT must be a valid acpp:… actor address");
    }
  }

  return {
    apiUrl,
    workspaceId,
    subject,
    mcpConnectionId: env.ACPP_MCP_CONNECTION_ID || undefined,
    githubConnectionId: env.ACPP_GITHUB_CONNECTION_ID || undefined,
    embedded,
  };
}
