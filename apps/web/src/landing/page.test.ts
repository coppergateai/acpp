import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCS, GITHUB_REPO, INTEGRATIONS, PROTOCOL_LAYERS, SCENARIO, SDK_CODE_SAMPLE } from "./constants.ts";
import { renderLandingPage } from "./page.ts";

describe("@acpp/web landing", () => {
  it("renders core positioning and real destinations", () => {
    const html = renderLandingPage();
    assert.match(html, /Identity for AI agents\./);
    assert.match(html, /Verifiable identity\. Explicit permissions\. Accountable actions\./);
    assert.match(html, /Identity ≠ Authority/);
    assert.match(html, /Discovery ≠ Consent/);
    assert.match(html, /Signal ≠ Execution/);
    assert.doesNotMatch(html, /PRODUCT §5/);
    assert.doesNotMatch(html, /class="neq"/);
    assert.match(html, /See a real scenario/);
    assert.match(html, /AcppHostedClient/);
    assert.match(html, /signSignalEnvelope/);
    assert.ok(html.includes(GITHUB_REPO));
    assert.ok(html.includes(DOCS.quickstart));
    assert.ok(html.includes(DOCS.sdk));
    assert.match(html, /rel="canonical"/);
    assert.match(html, /favicon\.svg/);
    assert.match(html, /MIT License/);
  });

  it("renders a concrete GitHub triage scenario", () => {
    const html = renderLandingPage();
    assert.ok(html.includes(SCENARIO.title));
    assert.ok(html.includes(SCENARIO.setting.agent));
    assert.ok(html.includes(SCENARIO.setting.action));
    assert.match(html, /id="scenario"/);
    assert.match(html, /href="#scenario"/);
    for (const beat of SCENARIO.beats) {
      assert.ok(html.includes(beat.who), beat.who);
    }
  });

  it("labels protocol layers and integrations honestly", () => {
    const html = renderLandingPage();
    for (const layer of PROTOCOL_LAYERS) {
      assert.ok(html.includes(layer.name), layer.name);
      assert.ok(html.includes(layer.statusLabel), layer.statusLabel);
    }
    for (const item of INTEGRATIONS) {
      assert.ok(html.includes(item.name), item.name);
      assert.ok(html.includes(item.statusLabel), item.statusLabel);
    }
    assert.match(html, /Demonstration sequence/);
    assert.doesNotMatch(html, /ACPPClient/);
    assert.ok(SDK_CODE_SAMPLE.includes("@acpp/sdk"));
  });
});
