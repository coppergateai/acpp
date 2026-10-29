import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DASHBOARD_NAV } from "./shell.ts";
import { renderDashboardPage } from "./inspector.ts";
import {
  DASHBOARD_ROUTES,
  isDashboardRoute,
  renderApprovalsBody,
  renderDashboardRouteBody,
  renderDevelopersBody,
  renderOnboardingBody,
  renderOverviewBody,
} from "./dashboard.ts";

describe("@acpp/web dashboard P-031", () => {
  it("registers dashboard IA routes", () => {
    for (const route of DASHBOARD_ROUTES) {
      assert.ok(isDashboardRoute(route), route);
      const body = renderDashboardRouteBody(route, "http://127.0.0.1:8787");
      assert.ok(body && body.length > 0, route);
    }
    assert.equal(renderDashboardRouteBody("/", "http://127.0.0.1:8787"), null);
    assert.equal(renderDashboardRouteBody("/nope", "http://127.0.0.1:8787"), null);
  });

  it("overview prompts for workspaceId and onboarding", () => {
    const html = renderOverviewBody("http://127.0.0.1:8787");
    assert.match(html, /workspaceId/);
    assert.match(html, /href="\/onboarding"/);
    assert.match(html, /overview-counts/);
  });

  it("approvals inbox degrades when list endpoint is missing", () => {
    const html = renderApprovalsBody("http://127.0.0.1:8787");
    assert.match(html, /GET \/v1\/approvals\?status=pending/);
    assert.match(html, /SEC-012/);
    assert.match(html, /approval-table/);
  });

  it("developers page links OpenAPI, quickstart, MCP host, and SDK", () => {
    const html = renderDevelopersBody("http://api.test:8787");
    assert.match(html, /http:\/\/api\.test:8787\/v1\/openapi\.json/);
    assert.match(html, /docs\/QUICKSTART\.md/);
    assert.match(html, /mcp-host\.md/);
    assert.match(html, /@acpp\/sdk/);
    assert.match(html, /ACPP_EMBEDDED/);
  });

  it("onboarding checklist covers PRODUCT §11.2 steps and ends at Receipts", () => {
    const html = renderOnboardingBody();
    assert.match(html, /Onboarding/);
    assert.match(html, /Create a workspace/);
    assert.match(html, /Register the first agent identity/);
    assert.match(html, /Observe the decision and receipt/);
    assert.match(html, /href="\/receipts"/);
    assert.match(html, /data-step="8"/);
  });

  it("dashboard shell uses real nav hrefs for all sections", () => {
    const page = renderDashboardPage({
      title: "ACPP",
      nav: DASHBOARD_NAV,
      body: "<p>hi</p>",
      apiBase: "http://127.0.0.1:8787",
    });
    assert.match(page, /href="\/dashboard"/);
    assert.match(page, /href="\/identities"/);
    assert.match(page, /href="\/connections"/);
    assert.match(page, /href="\/signals"/);
    assert.match(page, /href="\/permissions"/);
    assert.match(page, /href="\/approvals"/);
    assert.match(page, /href="\/receipts"/);
    assert.match(page, /href="\/developers"/);
    assert.doesNotMatch(page, /href="#identities"/);
  });
});
