import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DASHBOARD_NAV, dashboardNavHref, pageTitle } from "./shell.ts";

describe("@acpp/web shell", () => {
  it("exposes PRODUCT §11.1 nav including Approvals and Developers", () => {
    assert.deepEqual([...DASHBOARD_NAV], [
      "Overview",
      "Identities",
      "Connections",
      "Signals",
      "Permissions",
      "Approvals",
      "Receipts",
      "Developers",
    ]);
    assert.match(pageTitle(), /ACPP/);
  });

  it("maps every nav item to a real path", () => {
    for (const item of DASHBOARD_NAV) {
      const href = dashboardNavHref(item);
      assert.ok(href.startsWith("/"), item);
      assert.doesNotMatch(href, /^#/);
    }
    assert.equal(dashboardNavHref("Overview"), "/dashboard");
    assert.equal(dashboardNavHref("Developers"), "/developers");
    assert.equal(dashboardNavHref("Approvals"), "/approvals");
  });
});
