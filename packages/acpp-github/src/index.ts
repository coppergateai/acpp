import type { ActorAddress } from "@acpp/core";
import { performGithubHttpAction, type GithubHttpClient } from "./http.js";

/** First MVP connector: one GitHub connection serving multiple agents with different grants. */
export type GithubConnection = {
  connectionId: string;
  workspaceId: string;
  installationId: string;
  /** Credential reference only — never the raw token in protocol records. */
  credentialRef: string;
  createdAt: string;
};

export type GithubProtectedAction =
  | "issues.comment"
  | "repos.metadata.read";

export type GithubActionRequest = {
  subject: ActorAddress;
  connectionId: string;
  repo: string;
  action: GithubProtectedAction;
  payload?: Record<string, unknown>;
};

export function githubResource(repo: string): string {
  return `github:repo:${repo}`;
}

export type ExecuteGithubDeps = {
  /** Resolved server-side after authorization — never supplied by the calling agent. */
  token?: string;
  http?: GithubHttpClient;
};

/**
 * Execute a protected GitHub operation when policy allows.
 * Credentials must not be exposed to unauthorized agents.
 */
export async function executeGithubAction(
  req: GithubActionRequest,
  authorized: boolean,
  deps: ExecuteGithubDeps = {},
): Promise<{ ok: boolean; externalRef?: string; error?: string }> {
  if (!authorized) {
    return { ok: false, error: "unauthorized" };
  }
  if (!deps.token) {
    return { ok: false, error: "connection_credential_unavailable" };
  }
  const http = deps.http ?? { fetch };
  return performGithubHttpAction(req, deps.token, http);
}

export { performGithubHttpAction, parseGithubRepo, type GithubHttpClient } from "./http.js";
