import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TTFV_ONBOARDING_STEPS,
  renderOnboardingChecklist,
  renderOnboardingPage,
} from "./onboarding.ts";

describe("@acpp/web onboarding (P-031 TTFV)", () => {
  it("defines eight first-time steps per PRODUCT §11.2", () => {
    assert.equal(TTFV_ONBOARDING_STEPS.length, 8);
    assert.equal(TTFV_ONBOARDING_STEPS[0]?.step, 1);
    assert.match(TTFV_ONBOARDING_STEPS[0]?.title ?? "", /authenticate/i);
    assert.match(TTFV_ONBOARDING_STEPS[7]?.title ?? "", /receipt/i);
  });

  it("renders checklist and guided wedge page", () => {
    const checklist = renderOnboardingChecklist({
      apiBase: "http://127.0.0.1:8787",
    });
    assert.match(checklist, /Step 8/);
    const page = renderOnboardingPage("http://127.0.0.1:8787");
    assert.match(page, /run-onboarding-wedge/);
    assert.match(page, /create-workspace/);
    assert.match(page, /POST \/v1\/workspaces/);
  });
});
