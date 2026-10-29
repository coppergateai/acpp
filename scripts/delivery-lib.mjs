/**
 * Coppergate delivery head helpers (AG-004).
 * delivery_error / branch head moved when a pinned SHA disagrees with HEAD or origin.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(scriptDir, "..");

/** @param {string} sha */
export function shortSha(sha) {
  const s = sha?.trim() ?? "";
  return s.length >= 7 ? s.slice(0, 7) : s;
}

/**
 * @param {object} detail
 * @param {string} detail.expectedHead
 * @param {string} detail.actualHead
 * @param {string} [detail.reason]
 */
export function buildBranchHeadMovedPayload(detail) {
  const expected = detail.expectedHead.trim();
  const actual = detail.actualHead.trim();
  const fixCommand = "pnpm sync:delivery-head";
  return {
    ok: false,
    check: "delivery-head",
    errorCode: "delivery_error",
    reason: detail.reason ?? "branch_head_moved",
    message: `branch head moved: expected ${shortSha(expected)} got ${shortSha(actual)}`,
    expectedHead: expected,
    actualHead: actual,
    remediation: fixCommand,
    hint:
      "Fetch latest main, rebase your branch once, push a single head SHA, wait for CI on that SHA, then Retry delivery in Coppergate",
  };
}

/**
 * @param {object} detail
 * @param {string} detail.localHead
 * @param {string} detail.remoteHead
 * @param {string} detail.branch
 */
export function buildRemoteHeadMismatchPayload(detail) {
  return {
    ...buildBranchHeadMovedPayload({
      expectedHead: detail.remoteHead,
      actualHead: detail.localHead,
      reason: "local_not_pushed_to_origin",
    }),
    branch: detail.branch,
    hint:
      "Local HEAD differs from origin — run `pnpm sync:delivery-head` (or push) so GitHub matches your branch tip before delivery",
  };
}

/** @returns {string | null} */
export function resolveExpectedDeliveryHead() {
  for (const key of [
    "COPPERGATE_EXPECTED_HEAD_SHA",
    "COPPERGATE_BRANCH_HEAD_SHA",
    "COPPERGATE_DELIVERY_HEAD_SHA",
  ]) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

/** @returns {string | null} */
export function gitRevParse(ref, cwd = repoRoot) {
  const r = spawnSync("git", ["rev-parse", ref], {
    cwd,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/** @returns {string | null} */
export function currentBranch(cwd = repoRoot) {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  const name = r.stdout.trim();
  if (!name || name === "HEAD") return null;
  return name;
}

/** @returns {{ ok: true } | { ok: false; status: number; stderr: string }} */
export function gitFetchOrigin(cwd = repoRoot) {
  const r = spawnSync("git", ["fetch", "origin", "--prune"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status === 0) return { ok: true };
  return {
    ok: false,
    status: r.status ?? 1,
    stderr: `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim(),
  };
}

/**
 * @param {object} input
 * @param {string | null} input.expectedHead — pinned delivery SHA (optional)
 * @param {string} input.localHead
 * @param {string | null} input.remoteHead
 * @param {string | null} input.branch
 */
export function analyzeDeliveryHead(input) {
  const { expectedHead, localHead, remoteHead, branch } = input;

  if (expectedHead && expectedHead !== localHead) {
    return {
      ok: false,
      kind: "pinned_mismatch",
      payload: buildBranchHeadMovedPayload({
        expectedHead,
        actualHead: localHead,
      }),
    };
  }

  if (
    branch &&
    remoteHead &&
    localHead &&
    remoteHead !== localHead &&
    branch !== "main" &&
    branch !== "master"
  ) {
    return {
      ok: false,
      kind: "remote_mismatch",
      payload: buildRemoteHeadMismatchPayload({
        localHead,
        remoteHead,
        branch,
      }),
    };
  }

  return {
    ok: true,
    expectedHead: expectedHead ?? null,
    localHead,
    remoteHead,
    branch,
  };
}
