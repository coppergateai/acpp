/**
 * Lockfile sync helpers for pnpm monorepo (AG-002 / AG-003).
 * Coppergate delivery refuse uses errorCode lockfile_out_of_sync when manifests
 * change without refreshing the workspace lockfile.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const LOCKFILE_CANDIDATES = [
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(scriptDir, "..");

/** @param {string | undefined} packageManagerField */
export function lockfileForPackageManager(packageManagerField) {
  const pm = packageManagerField?.trim() ?? "";
  if (pm.startsWith("pnpm")) return "pnpm-lock.yaml";
  if (pm.startsWith("npm")) return "package-lock.json";
  if (pm.startsWith("yarn")) return "yarn.lock";
  return "pnpm-lock.yaml";
}

export function readRootPackageManager() {
  try {
    const raw = readFileSync(join(repoRoot, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    return /** @type {string | undefined} */ (pkg.packageManager);
  } catch {
    return undefined;
  }
}

export function expectedLockfileName() {
  return lockfileForPackageManager(readRootPackageManager());
}

/**
 * @param {string[]} changedPaths — repo-relative paths
 * @param {string} expectedLockfile
 */
export function analyzeLockfileCoChange(changedPaths, expectedLockfile) {
  const normalized = changedPaths
    .map((p) => p.replace(/^\.\//, "").trim())
    .filter(Boolean);

  const packageJsonChanged = normalized.filter((p) =>
    p.endsWith("package.json"),
  );
  const lockfilesTouched = normalized.filter((p) =>
    LOCKFILE_CANDIDATES.includes(p),
  );
  const expectedLockfileChanged = normalized.includes(expectedLockfile);

  if (packageJsonChanged.length === 0) {
    return { ok: true, reason: "no_package_json_changes" };
  }

  if (expectedLockfileChanged) {
    return {
      ok: true,
      reason: "lockfile_co_changed",
      packageJsonChanged,
      expectedLockfile,
    };
  }

  const wrongLockfiles = lockfilesTouched.filter(
    (f) => f !== expectedLockfile,
  );

  return {
    ok: false,
    reason: "lockfile_missing_from_diff",
    packageJsonChanged,
    expectedLockfile,
    wrongLockfiles,
    lockfilesTouched,
  };
}

/**
 * @param {object} detail
 * @param {string} detail.expectedLockfile
 * @param {string[]} [detail.packageJsonChanged]
 * @param {string[]} [detail.wrongLockfiles]
 */
export function buildLockfileOutOfSyncPayload(detail) {
  const fixCommand = "pnpm fix:lockfile";
  return {
    ok: false,
    check: "lockfile-sync",
    errorCode: "lockfile_out_of_sync",
    message:
      "package.json changed without refreshing the workspace lockfile — run the package manager install",
    expectedLockfile: detail.expectedLockfile,
    packageJsonChanged: detail.packageJsonChanged ?? [],
    wrongLockfiles: detail.wrongLockfiles ?? [],
    remediation: fixCommand,
    hint: `Run \`${fixCommand}\` (or \`pnpm install\`) and commit ${detail.expectedLockfile} with your dependency edits`,
  };
}
