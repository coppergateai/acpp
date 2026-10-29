import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeLockfileCoChange,
  buildLockfileOutOfSyncPayload,
  lockfileForPackageManager,
} from "./lockfile-lib.mjs";

describe("lockfileForPackageManager", () => {
  it("maps pnpm packageManager field", () => {
    assert.equal(lockfileForPackageManager("pnpm@9.15.9"), "pnpm-lock.yaml");
  });

  it("maps npm and yarn", () => {
    assert.equal(lockfileForPackageManager("npm@10.0.0"), "package-lock.json");
    assert.equal(lockfileForPackageManager("yarn@4.0.0"), "yarn.lock");
  });
});

describe("analyzeLockfileCoChange", () => {
  const expected = "pnpm-lock.yaml";

  it("passes when no package.json in diff", () => {
    const r = analyzeLockfileCoChange(["apps/api/src/index.ts"], expected);
    assert.equal(r.ok, true);
  });

  it("passes when lockfile co-changed", () => {
    const r = analyzeLockfileCoChange(
      ["packages/foo/package.json", "pnpm-lock.yaml"],
      expected,
    );
    assert.equal(r.ok, true);
    assert.equal(r.reason, "lockfile_co_changed");
  });

  it("fails when package.json changed without lockfile", () => {
    const r = analyzeLockfileCoChange(
      ["packages/acpp-sdk/package.json"],
      expected,
    );
    assert.equal(r.ok, false);
    assert.deepEqual(r.packageJsonChanged, ["packages/acpp-sdk/package.json"]);
    assert.equal(r.expectedLockfile, expected);
  });

  it("fails when wrong lockfile touched instead of pnpm", () => {
    const r = analyzeLockfileCoChange(
      ["package.json", "package-lock.json"],
      expected,
    );
    assert.equal(r.ok, false);
    assert.deepEqual(r.wrongLockfiles, ["package-lock.json"]);
  });
});

describe("buildLockfileOutOfSyncPayload", () => {
  it("includes Coppergate errorCode and remediation", () => {
    const payload = buildLockfileOutOfSyncPayload({
      expectedLockfile: "pnpm-lock.yaml",
      packageJsonChanged: ["package.json"],
    });
    assert.equal(payload.errorCode, "lockfile_out_of_sync");
    assert.equal(payload.remediation, "pnpm fix:lockfile");
    assert.match(payload.hint, /pnpm-lock\.yaml/);
  });
});
