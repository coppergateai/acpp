import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDeliveryHead,
  buildBranchHeadMovedPayload,
  shortSha,
} from "./delivery-lib.mjs";

describe("shortSha", () => {
  it("truncates to seven characters", () => {
    assert.equal(shortSha("b5ba2b04142bdeadbeef"), "b5ba2b0");
  });
});

describe("buildBranchHeadMovedPayload", () => {
  it("includes Coppergate errorCode and remediation", () => {
    const payload = buildBranchHeadMovedPayload({
      expectedHead: "b5ba2b04142bdeadbeef",
      actualHead: "9856213ce924cafebabe",
    });
    assert.equal(payload.errorCode, "delivery_error");
    assert.equal(payload.remediation, "pnpm sync:delivery-head");
    assert.match(payload.message, /expected b5ba2b0 got 9856213/);
  });
});

describe("analyzeDeliveryHead", () => {
  const local = "9856213ce924cafebabe00000000000000000000";
  const remote = "9856213ce924cafebabe00000000000000000000";
  const pinned = "b5ba2b04142bdeadbeef00000000000000000000";

  it("passes when pin matches local and origin", () => {
    const r = analyzeDeliveryHead({
      expectedHead: local,
      localHead: local,
      remoteHead: remote,
      branch: "arena/ag-004",
    });
    assert.equal(r.ok, true);
  });

  it("fails when pinned head differs from local", () => {
    const r = analyzeDeliveryHead({
      expectedHead: pinned,
      localHead: local,
      remoteHead: remote,
      branch: "arena/ag-004",
    });
    assert.equal(r.ok, false);
    assert.equal(r.kind, "pinned_mismatch");
    assert.equal(r.payload.errorCode, "delivery_error");
  });

  it("fails when local differs from origin on feature branch", () => {
    const r = analyzeDeliveryHead({
      expectedHead: null,
      localHead: local,
      remoteHead: pinned,
      branch: "arena/ag-004",
    });
    assert.equal(r.ok, false);
    assert.equal(r.kind, "remote_mismatch");
  });

  it("skips origin compare on main", () => {
    const r = analyzeDeliveryHead({
      expectedHead: null,
      localHead: local,
      remoteHead: pinned,
      branch: "main",
    });
    assert.equal(r.ok, true);
  });
});
