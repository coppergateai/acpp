import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderSectionBody } from "./sections.ts";
import { DASHBOARD_NAV } from "./shell.ts";

describe("@acpp/web sections", () => {
  it("renders overview IA grid and TTFV link", () => {
    const overview = DASHBOARD_NAV.find((n) => n.id === "overview")!;
    const html = renderSectionBody(overview, "http://127.0.0.1:8787");
    assert.match(html, /ia-grid/);
    assert.match(html, /\/onboarding/);
    assert.match(html, /Developers/);
  });

  it("embeds receipts inspector on receipts route", () => {
    const receipts = DASHBOARD_NAV.find((n) => n.id === "receipts")!;
    const html = renderSectionBody(receipts, "http://127.0.0.1:8787");
    assert.match(html, /run-wedge/);
  });
});
