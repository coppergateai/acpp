#!/usr/bin/env node
/**
 * Fail CI when package.json manifests disagree with pnpm-lock.yaml.
 * Catches agent deliveries that forget `pnpm install` after dependency edits.
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["install", "--frozen-lockfile", "--ignore-scripts"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.status === 0) {
  console.log(JSON.stringify({ ok: true, check: "frozen-lockfile" }));
  process.exit(0);
}

const err = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
console.error(
  JSON.stringify(
    {
      ok: false,
      check: "frozen-lockfile",
      hint: "Update pnpm-lock.yaml (pnpm install) whenever package.json dependencies change",
      detail: err.slice(0, 1500),
    },
    null,
    2,
  ),
);
process.exit(result.status || 1);
