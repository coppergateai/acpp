import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ExecutionStore } from "./execution-store.ts";

describe("ExecutionStore", () => {
  it("tracks lifecycle states and refuses blind retry on outcome_unknown", () => {
    const store = new ExecutionStore();
    const started = store.start({
      workspaceId: "ws_exec",
      subject: "acpp:agent:01JEXEC01",
      resource: "github:repo:org/repo",
      action: "issues.comment",
      payloadHash: "hash1",
      connectionId: "conn_1",
      idempotencyKey: "idem-1",
    });
    assert.equal(started.state, "not_started");
    store.setState(started.executionId, "authorized");
    store.setState(started.executionId, "running");
    store.setState(started.executionId, "outcome_unknown", {
      note: "timeout",
    });

    const blocked = store.assertBlindRetryAllowed({
      workspaceId: "ws_exec",
      subject: "acpp:agent:01JEXEC01",
      resource: "github:repo:org/repo",
      action: "issues.comment",
      payloadHash: "hash1",
      connectionId: "conn_1",
    });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.reason, "outcome_unknown_no_blind_retry");
    }

    const withKey = store.assertBlindRetryAllowed({
      workspaceId: "ws_exec",
      subject: "acpp:agent:01JEXEC01",
      resource: "github:repo:org/repo",
      action: "issues.comment",
      payloadHash: "hash1",
      connectionId: "conn_1",
      idempotencyKey: "idem-1",
    });
    assert.equal(withKey.allowed, true);

    const readRetry = store.assertBlindRetryAllowed({
      workspaceId: "ws_exec",
      subject: "acpp:agent:01JEXEC01",
      resource: "github:repo:org/repo",
      action: "repos.metadata.read",
      payloadHash: "hash1",
      connectionId: "conn_1",
    });
    assert.equal(readRetry.allowed, true);
  });
});
