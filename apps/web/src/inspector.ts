import type { ReceiptChainStep } from "@acpp/receipts";

export type WedgeProofPayload = {
  workspaceId: string;
  allowReceipt: { receiptId: string; signalId: string };
  denyReceipt: { receiptId: string; signalId: string };
  allowChain: ReceiptChainStep[];
  denyChain: ReceiptChainStep[];
  proof: {
    beforeRevoke: { allowed: boolean; executionOk: boolean };
    afterRevoke: { allowed: boolean; executeStatus: number };
  };
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderChainSteps(steps: ReceiptChainStep[]): string {
  return steps
    .map(
      (step) =>
        `<li class="chain-step ${step.ok ? "ok" : "deny"}" data-phase="${escapeHtml(step.phase)}">` +
        `<strong>${escapeHtml(step.label)}</strong> — ${escapeHtml(step.detail)}` +
        `</li>`,
    )
    .join("");
}

export function renderReceiptInspector(proof: WedgeProofPayload): string {
  const revokeOk =
    proof.proof.beforeRevoke.allowed &&
    proof.proof.beforeRevoke.executionOk &&
    !proof.proof.afterRevoke.allowed &&
    proof.proof.afterRevoke.executeStatus === 403;

  return `
<section id="receipt-inspector">
  <h2>Receipt inspector</h2>
  <p>Signal → identity verification → authorization decision → execution outcome (PRODUCT §13.1 #8).</p>
  <h3>Allow receipt <code>${escapeHtml(proof.allowReceipt.receiptId)}</code></h3>
  <ol class="chain">${renderChainSteps(proof.allowChain)}</ol>
  <h3>Deny receipt (after revoke) <code>${escapeHtml(proof.denyReceipt.receiptId)}</code></h3>
  <ol class="chain">${renderChainSteps(proof.denyChain)}</ol>
</section>
<section id="revoke-proof" class="${revokeOk ? "proof-ok" : "proof-fail"}">
  <h2>Revoke-then-deny proof</h2>
  <p>PRODUCT §13.1 #9 — access revoked; subsequent request denied.</p>
  <ul>
    <li>Before revoke: allowed=${proof.proof.beforeRevoke.allowed}, executionOk=${proof.proof.beforeRevoke.executionOk}</li>
    <li>After revoke: allowed=${proof.proof.afterRevoke.allowed}, executeStatus=${proof.proof.afterRevoke.executeStatus}</li>
  </ul>
  <p class="verdict"><strong>${revokeOk ? "Proof satisfied" : "Proof incomplete"}</strong></p>
</section>`;
}

export function renderDashboardPage(options: {
  title: string;
  nav: readonly string[];
  body: string;
  apiBase: string;
}): string {
  const nav = options.nav
    .map((n) => {
      const href =
        n === "Overview"
          ? "/"
          : n === "Receipts"
            ? "/receipts"
            : `#${n.toLowerCase()}`;
      return `<li><a href="${href}">${escapeHtml(n)}</a></li>`;
    })
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    nav ul { display: flex; flex-wrap: wrap; gap: 0.75rem; list-style: none; padding: 0; }
    .chain { list-style: decimal; padding-left: 1.5rem; }
    .chain-step.ok { color: #0a6; }
    .chain-step.deny { color: #c30; }
    #revoke-proof.proof-ok { border-left: 4px solid #0a6; padding-left: 1rem; }
    #revoke-proof.proof-fail { border-left: 4px solid #c30; padding-left: 1rem; }
    button { font: inherit; padding: 0.5rem 1rem; cursor: pointer; }
    .error { color: #c30; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(options.title)}</h1>
    <nav><ul>${nav}</ul></nav>
  </header>
  ${options.body}
  <footer><p><small>API: ${escapeHtml(options.apiBase)}</small></p></footer>
</body>
</html>`;
}

export function renderReceiptsPage(apiBase: string): string {
  const body = `
<section>
  <h2>Receipts</h2>
  <p>Run the wedge demo against the API to populate the inspector and revoke-then-deny proof.</p>
  <button type="button" id="run-wedge">Run wedge revoke proof</button>
  <div id="wedge-status" aria-live="polite"></div>
  <div id="wedge-result"></div>
</section>
<script>
(function () {
  const apiBase = ${JSON.stringify(apiBase)};
  const btn = document.getElementById("run-wedge");
  const status = document.getElementById("wedge-status");
  const result = document.getElementById("wedge-result");
  btn.addEventListener("click", async function () {
    status.textContent = "Running wedge proof…";
    result.innerHTML = "";
    try {
      const res = await fetch(apiBase + "/v1/demo/wedge-revoke-proof", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        status.innerHTML = '<span class="error">' + (data.message || data.error || res.status) + "</span>";
        return;
      }
      status.textContent = "Workspace " + data.workspaceId;
      const inspect = await fetch(apiBase + "/v1/receipts/" + encodeURIComponent(data.allowReceipt.receiptId) + "?workspaceId=" + encodeURIComponent(data.workspaceId));
      if (!inspect.ok) {
        status.innerHTML = '<span class="error">Could not load receipt</span>';
        return;
      }
      result.innerHTML = buildInspectorHtml(data);
    } catch (e) {
      status.innerHTML = '<span class="error">' + String(e) + "</span>";
    }
  });
  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
  function chainHtml(steps) {
    return steps.map(function (step) {
      return '<li class="chain-step ' + (step.ok ? 'ok' : 'deny') + '"><strong>' + esc(step.label) + '</strong> — ' + esc(step.detail) + '</li>';
    }).join("");
  }
  function buildInspectorHtml(data) {
    var revokeOk = data.proof.beforeRevoke.allowed && data.proof.beforeRevoke.executionOk && !data.proof.afterRevoke.allowed && data.proof.afterRevoke.executeStatus === 403;
    return '<section id="receipt-inspector"><h2>Receipt inspector</h2>' +
      '<h3>Allow receipt</h3><ol class="chain">' + chainHtml(data.allowChain) + '</ol>' +
      '<h3>Deny receipt (after revoke)</h3><ol class="chain">' + chainHtml(data.denyChain) + '</ol></section>' +
      '<section id="revoke-proof" class="' + (revokeOk ? 'proof-ok' : 'proof-fail') + '">' +
      '<h2>Revoke-then-deny proof</h2><p class="verdict"><strong>' + (revokeOk ? 'Proof satisfied' : 'Proof incomplete') + '</strong></p></section>';
  }
})();
</script>`;
  return body;
}
