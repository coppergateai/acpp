#!/usr/bin/env node
/**
 * Remediation for delivery_error branch head moved (AG-004):
 * fetch origin, rebase feature branch onto origin/main, push with lease.
 */
import { spawnSync } from "node:child_process";
import {
  currentBranch,
  gitFetchOrigin,
  gitRevParse,
  repoRoot,
  shortSha,
} from "./delivery-lib.mjs";

function runGit(args, { allowFailure = false } = {}) {
  const r = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0 && !allowFailure) {
    const detail = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim();
    console.error(
      JSON.stringify(
        {
          ok: false,
          check: "sync-delivery-head",
          errorCode: "delivery_error",
          message: `git ${args.join(" ")} failed`,
          detail: detail.slice(0, 1500),
        },
        null,
        2,
      ),
    );
    process.exit(r.status || 1);
  }
  return r;
}

const fetch = gitFetchOrigin();
if (!fetch.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        check: "sync-delivery-head",
        errorCode: "delivery_error",
        message: "git fetch origin failed",
        detail: fetch.stderr.slice(0, 1500),
      },
      null,
      2,
    ),
  );
  process.exit(fetch.status || 1);
}

const branch = currentBranch();
if (!branch || branch === "HEAD") {
  console.error(
    JSON.stringify({
      ok: false,
      check: "sync-delivery-head",
      errorCode: "delivery_error",
      message: "refusing to sync from detached HEAD — checkout your PR branch first",
    }),
  );
  process.exit(1);
}

if (branch === "main" || branch === "master") {
  console.error(
    JSON.stringify({
      ok: false,
      check: "sync-delivery-head",
      errorCode: "delivery_error",
      message: `refusing to rebase/push protected branch ${branch}`,
    }),
  );
  process.exit(1);
}

const beforeHead = gitRevParse("HEAD");
const mainRef = gitRevParse("origin/main") ?? gitRevParse("origin/master");
if (!mainRef) {
  console.error(
    JSON.stringify({
      ok: false,
      check: "sync-delivery-head",
      errorCode: "delivery_error",
      message: "could not resolve origin/main or origin/master",
    }),
  );
  process.exit(1);
}

const mergeBase = runGit(["merge-base", "HEAD", mainRef], {
  allowFailure: true,
});
const mergeBaseSha =
  mergeBase.status === 0 ? mergeBase.stdout.trim() : null;

let rebased = false;
if (mergeBaseSha && mergeBaseSha !== mainRef) {
  runGit(["rebase", mainRef]);
  rebased = true;
}

const afterHead = gitRevParse("HEAD");
const pushArgs = rebased
  ? ["push", "--force-with-lease", "origin", `HEAD:${branch}`]
  : ["push", "origin", `HEAD:${branch}`];
runGit(pushArgs);

const remoteHead = gitRevParse(`origin/${branch}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      check: "sync-delivery-head",
      branch,
      rebasedOnto: rebased ? mainRef : null,
      beforeHead,
      afterHead,
      remoteHead,
      hint: `Delivery pin should target ${shortSha(afterHead ?? "")} — wait for CI on that SHA, then Retry in Coppergate`,
    },
    null,
    2,
  ),
);
