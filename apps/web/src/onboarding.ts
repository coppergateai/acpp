/** First-time experience — PRODUCT §11.2 (TTFV steps 1–8). */
export type OnboardingStep = {
  step: number;
  title: string;
  detail: string;
  /** Optional API route hint for the guided flow. */
  apiRoute?: string;
};

export const TTFV_ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    step: 1,
    title: "Create an account or authenticate",
    detail:
      "Sign in with a supported identity provider. In local dev, continue with an implicit operator session.",
  },
  {
    step: 2,
    title: "Create a workspace",
    detail: "Create a tenant workspace that owns identities, connections, and grants.",
    apiRoute: "POST /v1/workspaces",
  },
  {
    step: 3,
    title: "Register the first agent identity",
    detail: "Register an agent with a stable acpp:agent:… address in the workspace.",
    apiRoute: "POST /v1/workspaces/{workspaceId}/identities",
  },
  {
    step: 4,
    title: "Establish verification credentials",
    detail:
      "Enroll an Ed25519 public key and verify signatures before any protected action.",
    apiRoute: "POST /v1/verify",
  },
  {
    step: 5,
    title: "Connect one supported tool",
    detail: "Connect GitHub once for the workspace; credentials stay isolated behind refs.",
    apiRoute: "POST /v1/workspaces/{workspaceId}/connections/github",
  },
  {
    step: 6,
    title: "Grant a narrowly scoped permission",
    detail: "Create a PermissionGrant for a single resource and action (deny-by-default until granted).",
    apiRoute: "POST /v1/grants",
  },
  {
    step: 7,
    title: "Send a test signal or make a test request",
    detail:
      "Submit an authenticated signal or gated GitHub action so policy can evaluate the request.",
    apiRoute: "POST /v1/signals or POST /v1/github/actions/execute",
  },
  {
    step: 8,
    title: "Observe the authorization decision and resulting receipt",
    detail:
      "Inspect the receipt chain: which identity acted, which connection was used, what was authorized, and what happened.",
    apiRoute: "GET /v1/receipts/{receiptId}",
  },
] as const;

export function renderOnboardingChecklist(options: {
  apiBase: string;
  compact?: boolean;
}): string {
  const items = TTFV_ONBOARDING_STEPS.map(
    (s) =>
      `<li><strong>Step ${s.step}.</strong> ${escapeHtml(s.title)}` +
      (options.compact ? "" : ` — ${escapeHtml(s.detail)}`) +
      `</li>`,
  ).join("");
  return `<ol class="ttfv-checklist">${items}</ol>`;
}

export function renderOnboardingPage(apiBase: string): string {
  const stepsHtml = TTFV_ONBOARDING_STEPS.map(
    (s) =>
      `<article class="onboarding-step" data-step="${s.step}" id="step-${s.step}">` +
      `<h3>Step ${s.step}: ${escapeHtml(s.title)}</h3>` +
      `<p>${escapeHtml(s.detail)}</p>` +
      (s.apiRoute ? `<p><small>API: <code>${escapeHtml(s.apiRoute)}</code></small></p>` : "") +
      `</article>`,
  ).join("");

  return `
<section id="onboarding-wedge">
  <h2>First-time value (TTFV)</h2>
  <p>
    Walk through PRODUCT §11.2 in order. You should understand exactly which identity acted,
    which connection was used, what was authorized, and what happened.
  </p>
  ${stepsHtml}
  <section class="onboarding-actions">
    <h3>Guided wedge</h3>
    <p>
      Step 1 is your operator session in dev. The button below runs the locked GitHub wedge demo
      (workspace → agent → connection → grant → signal → receipt → revoke → deny) covering steps 2–8.
    </p>
    <button type="button" id="run-onboarding-wedge">Run onboarding wedge</button>
    <div id="onboarding-status" aria-live="polite"></div>
    <pre id="onboarding-log" class="onboarding-log"></pre>
  </section>
  <section class="onboarding-actions">
    <h3>Step 2 — create a workspace (manual)</h3>
    <p>Optional: create a workspace via the API before wiring identities yourself.</p>
    <button type="button" id="create-workspace">Create workspace</button>
    <div id="workspace-result"></div>
  </section>
</section>
<script>
(function () {
  const apiBase = ${JSON.stringify(apiBase)};
  const logEl = document.getElementById("onboarding-log");
  const statusEl = document.getElementById("onboarding-status");
  const btn = document.getElementById("run-onboarding-wedge");
  const wsBtn = document.getElementById("create-workspace");
  const wsOut = document.getElementById("workspace-result");

  function log(line) {
    logEl.textContent = (logEl.textContent ? logEl.textContent + "\\n" : "") + line;
  }

  function markStepsDone() {
    for (var i = 1; i <= 8; i++) {
      var el = document.getElementById("step-" + i);
      if (el) el.classList.add("step-done");
    }
  }

  wsBtn.addEventListener("click", async function () {
    wsOut.textContent = "Creating…";
    try {
      const slug = "onboard-" + Date.now().toString(36);
      const wsRes = await fetch(apiBase + "/v1/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: slug,
          slug: slug,
          displayName: "Onboarding workspace"
        })
      });
      const wsBody = await wsRes.json();
      if (!wsRes.ok) throw new Error(wsBody.message || wsBody.error || wsRes.status);
      wsOut.textContent = "Workspace " + wsBody.workspace.workspaceId;
      var step2 = document.getElementById("step-2");
      if (step2) step2.classList.add("step-done");
    } catch (e) {
      wsOut.innerHTML = '<span class="error">' + String(e) + "</span>";
    }
  });

  btn.addEventListener("click", async function () {
    logEl.textContent = "";
    statusEl.textContent = "Running…";
    try {
      log("Step 1: local operator session (dev)");
      const wedgeRes = await fetch(apiBase + "/v1/demo/wedge-revoke-proof", { method: "POST" });
      const wedge = await wedgeRes.json();
      if (!wedgeRes.ok) throw new Error(wedge.message || wedge.error || wedgeRes.status);
      log("Steps 2–8: workspace " + wedge.workspaceId);
      log("Grant " + wedge.grantId + " → allow receipt " + wedge.allowReceipt.receiptId);
      log("After revoke → deny receipt " + wedge.denyReceipt.receiptId);
      statusEl.innerHTML = 'Done — <a href="/receipts">open Receipts &amp; Audit</a> for the inspector.';
      markStepsDone();
    } catch (e) {
      statusEl.innerHTML = '<span class="error">' + String(e) + "</span>";
    }
  });
})();
</script>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
