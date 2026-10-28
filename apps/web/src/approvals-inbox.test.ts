import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPROVAL_INBOX_FIELDS,
  APPROVAL_POLICY_MODES,
  approvalInboxHeadline,
  policyModeUserLabel,
} from "./approvals-inbox.ts";

describe("@acpp/web approvals inbox", () => {
  it("documents PRODUCT §11.6 inbox fields and §9.4 policy modes", () => {
    assert.equal(APPROVAL_INBOX_FIELDS.length, 8);
    assert.ok(APPROVAL_POLICY_MODES.includes("approval_required"));
    assert.match(approvalInboxHeadline(), /not a notification/i);
    assert.match(policyModeUserLabel("denied"), /prohibited/i);
  });
});
