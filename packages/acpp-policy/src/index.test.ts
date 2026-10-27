import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateGrant, type PermissionGrant } from "./index.ts";

const subject = "acpp:agent:01JTEST" as const;

describe("@acpp/policy", () => {
  it("denies when no grant", () => {
    const d = evaluateGrant([], {
      subject,
      resource: "github:repo:acme/app",
      action: "issues.comment",
    });
    assert.equal(d.allow, false);
    assert.equal(d.reason, "no_matching_grant");
  });

  it("allows matching non-revoked grant", () => {
    const grants: PermissionGrant[] = [
      {
        grantId: "g1",
        subject,
        resource: "github:repo:acme/app",
        action: "issues.comment",
        requiresApproval: false,
      },
    ];
    const d = evaluateGrant(grants, {
      subject,
      resource: "github:repo:acme/app",
      action: "issues.comment",
    });
    assert.equal(d.allow, true);
    assert.equal(d.grantId, "g1");
  });

  it("rejects revoked grant", () => {
    const grants: PermissionGrant[] = [
      {
        grantId: "g1",
        subject,
        resource: "github:repo:acme/app",
        action: "issues.comment",
        requiresApproval: false,
        revokedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const d = evaluateGrant(grants, {
      subject,
      resource: "github:repo:acme/app",
      action: "issues.comment",
      at: "2026-02-01T00:00:00.000Z",
    });
    assert.equal(d.allow, false);
  });
});
