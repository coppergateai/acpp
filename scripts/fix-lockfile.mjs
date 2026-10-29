#!/usr/bin/env node
/**
 * Regenerate pnpm-lock.yaml after package.json dependency edits (AG-003 remediation).
 */
import { spawnSync } from "node:child_process";
import { expectedLockfileName, repoRoot } from "./lockfile-lib.mjs";

const lockfile = expectedLockfileName();
if (lockfile !== "pnpm-lock.yaml") {
  console.error(
    JSON.stringify({
      ok: false,
      errorCode: "lockfile_out_of_sync",
      message: `Unsupported lockfile target ${lockfile} in fix-lockfile`,
    }),
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["install"], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (result.status !== 0) {
  const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  console.error(
    JSON.stringify(
      {
        ok: false,
        errorCode: "lockfile_out_of_sync",
        message: "pnpm install failed while refreshing lockfile",
        detail: detail.slice(0, 1500),
      },
      null,
      2,
    ),
  );
  process.exit(result.status || 1);
}

console.log(
  JSON.stringify({
    ok: true,
    check: "fix-lockfile",
    lockfile,
    hint: `Commit ${lockfile} together with your package.json changes`,
  }),
);
