import { DASHBOARD_NAV, type DashboardNavItem } from "./shell.js";
import { renderOnboardingChecklist } from "./onboarding.js";
import { renderReceiptsPage } from "./inspector.js";

export function renderSectionBody(
  item: DashboardNavItem,
  apiBase: string,
): string {
  switch (item.id) {
    case "overview":
      return renderOverview(apiBase);
    case "identities":
      return renderPlaceholderSection(item, [
        "Register human, agent, service, and organization actors per workspace.",
        "Rotate, suspend, and revoke verification keys from identity detail (PRODUCT §11.3 — later slices).",
      ]);
    case "connections":
      return renderPlaceholderSection(item, [
        "Connect GitHub once per workspace; credentials are stored as isolated refs (P-020).",
        "Future connectors and MCP gateways appear here without duplicating grants.",
      ]);
    case "signals":
      return renderPlaceholderSection(item, [
        "Authenticated envelopes with delivery acks; delivery is not execution (S-011).",
        "Filter by correlation ID via GET /v1/signals?correlationId=…",
      ]);
    case "permissions":
      return renderPlaceholderSection(item, [
        "Deny-by-default grants with expiration and revoke (SEC-010, SEC-011).",
        "Approval-bound actions require explicit approval IDs on execute.",
      ]);
    case "receipts":
      return renderReceiptsPage(apiBase);
    case "developers":
      return renderDevelopers(apiBase);
    default:
      return renderPlaceholderSection(item, [item.blurb]);
  }
}

function renderOverview(apiBase: string): string {
  const cards = DASHBOARD_NAV.filter((n) => n.id !== "overview")
    .map(
      (n) =>
        `<article class="ia-card"><h3><a href="${n.path}">${escapeHtml(n.label)}</a></h3><p>${escapeHtml(n.blurb)}</p></article>`,
    )
    .join("");
  return `
<section id="overview-summary">
  <h2>Overview</h2>
  <p>Workspace summary for identities, signals, grants, approvals, and security events.</p>
  <div class="ia-grid">${cards}</div>
</section>
<section id="ttfv">
  <h2>Get to first value</h2>
  <p>Complete the onboarding wedge (PRODUCT §11.2) or jump to the <a href="/onboarding">guided flow</a>.</p>
  ${renderOnboardingChecklist({ apiBase, compact: true })}
</section>`;
}

function renderDevelopers(apiBase: string): string {
  return `
<section>
  <h2>Developers</h2>
  <p>Protocol-first integration surface — independent of this dashboard (PRODUCT §11.1).</p>
  <ul>
    <li>API base: <code>${escapeHtml(apiBase)}</code></li>
    <li>Health: <code>GET /health</code></li>
    <li>Protocol docs: <code>docs/protocol/</code> (identity, signals, authz, connections, receipts)</li>
    <li>GitHub wedge quickstart: <code>examples/wedge-github</code></li>
    <li>Open program: <code>docs/OPEN_PROGRAM.md</code></li>
  </ul>
</section>`;
}

function renderPlaceholderSection(
  item: DashboardNavItem,
  bullets: string[],
): string {
  const list = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  return `
<section>
  <h2>${escapeHtml(item.label)}</h2>
  <p>${escapeHtml(item.blurb)}</p>
  <ul>${list}</ul>
</section>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
