import type { GithubActionRequest } from "./index.js";

export type GithubHttpClient = {
  fetch: typeof fetch;
  apiBase?: string;
};

export function parseGithubRepo(repo: string): { owner: string; name: string } {
  const trimmed = repo.trim();
  const slash = trimmed.indexOf("/");
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error("invalid_repo");
  }
  return { owner: trimmed.slice(0, slash), name: trimmed.slice(slash + 1) };
}

async function githubRequest(
  path: string,
  token: string,
  http: GithubHttpClient,
  init: RequestInit = {},
): Promise<Response> {
  const base = http.apiBase ?? "https://api.github.com";
  const url = path.startsWith("http") ? path : `${base}${path}`;
  return http.fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function mapFetchFailure(err: unknown): {
  ok: false;
  error: string;
} {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  if (
    name === "AbortError" ||
    /aborted|abort/i.test(message)
  ) {
    return { ok: false, error: "aborted" };
  }
  if (/timeout|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(message)) {
    return { ok: false, error: "timeout" };
  }
  if (/fetch failed|ECONNRESET|ENOTFOUND|network/i.test(message)) {
    return { ok: false, error: "network_error" };
  }
  return { ok: false, error: "outcome_unknown" };
}

export async function performGithubHttpAction(
  req: GithubActionRequest,
  token: string,
  http: GithubHttpClient = { fetch },
): Promise<{ ok: boolean; externalRef?: string; error?: string; status?: number }> {
  const { owner, name } = parseGithubRepo(req.repo);
  const repoPath = `/repos/${owner}/${name}`;

  try {
    if (req.action === "repos.metadata.read") {
      const res = await githubRequest(repoPath, token, http, { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false,
          error: `github_http_${res.status}`,
          status: res.status,
          externalRef: text.slice(0, 120) || undefined,
        };
      }
      const body = (await res.json()) as { full_name?: string; id?: number };
      const ref =
        body.full_name != null
          ? `github:repo:${body.full_name}`
          : `github:repo:${owner}/${name}`;
      return { ok: true, externalRef: ref, status: res.status };
    }

    if (req.action === "issues.comment") {
      const payload = req.payload ?? {};
      const issueNumber = payload.issueNumber;
      const bodyText = payload.body;
      if (typeof issueNumber !== "number" || !Number.isInteger(issueNumber) || issueNumber < 1) {
        return { ok: false, error: "invalid_payload_issueNumber" };
      }
      if (typeof bodyText !== "string" || !bodyText.trim()) {
        return { ok: false, error: "invalid_payload_body" };
      }
      const res = await githubRequest(
        `${repoPath}/issues/${issueNumber}/comments`,
        token,
        http,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: bodyText }),
        },
      );
      if (!res.ok) {
        return { ok: false, error: `github_http_${res.status}`, status: res.status };
      }
      const comment = (await res.json()) as { id?: number; html_url?: string };
      const externalRef =
        comment.html_url ??
        (comment.id != null ? `github:issue_comment:${comment.id}` : undefined);
      return { ok: true, externalRef, status: res.status };
    }

    return { ok: false, error: `unsupported_action:${req.action}` };
  } catch (err) {
    return mapFetchFailure(err);
  }
}
