#!/usr/bin/env node
/**
 * Fail CI when package.json manifests disagree with pnpm-lock.yaml.
 * Catches agent deliveries that forget `pnpm install` after dependency edits.
 * Emits errorCode lockfile_out_of_sync for Coppergate delivery refuse (AG-003).
 */
import { spawnSync } from "node:child_process";
import {
  analyzeLockfileCoChange,
  buildLockfileOutOfSyncPayload,
  expectedLockfileName,
  repoRoot,
} from "./lockfile-lib.mjs";

/** @returns {string | null} */
function resolveGitBase() {
  const fromEnv =
    process.env.GIT_BASE_SHA ??
    process.env.COPPERGATE_BASE_SHA ??
    process.env.GITHUB_EVENT_PULL_REQUEST_BASE_SHA;
  if (fromEnv?.trim()) return fromEnv.trim();

  for (const ref of ["origin/main", "main"]) {
    const mb = spawnSync("git", ["merge-base", "HEAD", ref], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (mb.status === 0 && mb.stdout.trim()) return mb.stdout.trim();
  }
  return null;
}

/** @returns {string[] | null} */
function gitChangedPathsSince(base) {
  const diff = spawnSync("git", ["diff", "--name-only", base, "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (diff.status !== 0) return null;
  return diff.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function assertGitLockfileCoChange() {
  const base = resolveGitBase();
  if (!base) return { skipped: true };

  const changed = gitChangedPathsSince(base);
  if (!changed) return { skipped: true };

  const expectedLockfile = expectedLockfileName();
  const analysis = analyzeLockfileCoChange(changed, expectedLockfile);
  if (analysis.ok) {
    return { skipped: false, ok: true, base, expectedLockfile };
  }

  return {
    skipped: false,
    ok: false,
    base,
    analysis,
    expectedLockfile,
  };
}

function assertFrozenLockfile() {
  return spawnSync(
    "pnpm",
    ["install", "--frozen-lockfile", "--ignore-scripts"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

const gitCheck = assertGitLockfileCoChange();
const result = assertFrozenLockfile();

if (result.status === 0) {
  console.log(
    JSON.stringify({
      ok: true,
      check: "lockfile-sync",
      frozenLockfile: true,
      gitCoChange: gitCheck.skipped
        ? "skipped"
        : gitCheck.ok
          ? "ok"
          : "manifest_without_lockfile_in_diff",
    }),
  );
  process.exit(0);
}

const err = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
const expectedLockfile = expectedLockfileName();
const gitDetail =
  gitCheck.skipped === false && gitCheck.ok === false
    ? {
        packageJsonChanged: gitCheck.analysis.packageJsonChanged,
        wrongLockfiles: gitCheck.analysis.wrongLockfiles,
        gitBase: gitCheck.base,
      }
    : {};

console.error(
  JSON.stringify(
    {
      ...buildLockfileOutOfSyncPayload({
        expectedLockfile,
        packageJsonChanged: gitDetail.packageJsonChanged,
        wrongLockfiles: gitDetail.wrongLockfiles,
      }),
      check: "frozen-lockfile",
      ...gitDetail,
      detail: err.slice(0, 1500),
    },
    null,
    2,
  ),
);
process.exit(result.status || 1);
