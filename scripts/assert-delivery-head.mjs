#!/usr/bin/env node
/**
 * Pre-delivery guard: pinned branch head must match HEAD and origin (AG-004).
 * Emits errorCode delivery_error for Coppergate delivery refuse.
 */
import {
  analyzeDeliveryHead,
  currentBranch,
  gitFetchOrigin,
  gitRevParse,
  repoRoot,
  resolveExpectedDeliveryHead,
} from "./delivery-lib.mjs";

const fetch = gitFetchOrigin();
if (!fetch.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        check: "delivery-head",
        errorCode: "delivery_error",
        message: "git fetch origin failed before delivery head check",
        detail: fetch.stderr.slice(0, 1500),
        remediation: "pnpm sync:delivery-head",
      },
      null,
      2,
    ),
  );
  process.exit(fetch.status || 1);
}

const localHead = gitRevParse("HEAD");
if (!localHead) {
  console.error(
    JSON.stringify({
      ok: false,
      check: "delivery-head",
      errorCode: "delivery_error",
      message: "could not resolve HEAD",
    }),
  );
  process.exit(1);
}

const branch = currentBranch();
const remoteHead =
  branch != null ? gitRevParse(`origin/${branch}`) : null;
let expectedHead = resolveExpectedDeliveryHead();

if (
  !expectedHead &&
  process.env.GITHUB_ACTIONS === "true" &&
  process.env.GITHUB_SHA?.trim()
) {
  expectedHead = process.env.GITHUB_SHA.trim();
}

const skipOriginCompare =
  process.env.GITHUB_ACTIONS === "true" &&
  (branch == null || branch === "HEAD");

const analysis = analyzeDeliveryHead({
  expectedHead,
  localHead,
  remoteHead: skipOriginCompare ? localHead : remoteHead,
  branch: skipOriginCompare ? "main" : branch,
});

if (!analysis.ok) {
  console.error(JSON.stringify(analysis.payload, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      check: "delivery-head",
      localHead,
      branch: branch ?? "detached",
      remoteHead: remoteHead ?? "unknown",
      pinnedHead: expectedHead ?? "none",
      repoRoot,
    },
    null,
    2,
  ),
);
