import type { ActorAddress } from "@acpp/core";

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

/**
 * Stub executor — real GitHub HTTP lands in P-020.
 * Credentials must not be exposed to unauthorized agents.
 */
export async function executeGithubAction(
  _req: GithubActionRequest,
  authorized: boolean,
): Promise<{ ok: boolean; externalRef?: string; error?: string }> {
  if (!authorized) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true, externalRef: "stub:pending_p020" };
}
