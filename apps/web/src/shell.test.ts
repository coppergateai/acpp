import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DASHBOARD_NAV, pageTitle } from "./shell.ts";

describe("@acpp/web", () => {
  it("exposes product nav sections", () => {
    assert.ok(DASHBOARD_NAV.includes("Identities"));
    assert.ok(DASHBOARD_NAV.includes("Receipts"));
    assert.match(pageTitle(), /ACPP/);
  });
});
