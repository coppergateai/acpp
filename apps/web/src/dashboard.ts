/**
 * Dashboard IA pages (P-031) — Overview, list surfaces, Developers, onboarding.
 * Client scripts call existing GET APIs with `?workspaceId=`; missing endpoints degrade gracefully.
 */
import { escapeHtml, renderReceiptsPage } from "./inspector.js";
import { DOCS, GITHUB_REPO } from "./landing/constants.js";

const MCP_HOST_DOC = `${GITHUB_REPO}/blob/main/docs/protocol/mcp-host.md`;
const WEDGE_DOC = DOCS.wedge;
const QUICKSTART_DOC = DOCS.quickstart;

function workspaceBannerHtml(): string {
  return `
<section id="workspace-banner" class="banner">
  <p>Set <code>?workspaceId=ws_…</code> in the URL to load live data from the API.</p>
  <p>New here? Start the <a href="/onboarding">onboarding wedge flow</a>, then open
  <a href="/receipts">Receipts</a> to prove revoke-then-deny.</p>
</section>`;
}

/** Shared client helpers: read workspaceId, show banner when missing. */
function workspaceClientBoot(options: {
  apiBase: string;
  requireWorkspace: boolean;
  onReady: string;
}): string {
  return `
<script>
(function () {
  const apiBase = ${JSON.stringify(options.apiBase)};
  const params = new URLSearchParams(location.search);
  const workspaceId = params.get("workspaceId");
  const banner = document.getElementById("workspace-banner");
  const main = document.getElementById("dash-main");
  function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function withWs(href) {
    if (!workspaceId) return href;
    const u = new URL(href, location.origin);
    u.searchParams.set("workspaceId", workspaceId);
    return u.pathname + u.search;
  }
  document.querySelectorAll("nav a[href^='/']").forEach(function (a) {
    const path = a.getAttribute("href");
    if (path && path.startsWith("/") && !path.startsWith("//")) {
      a.setAttribute("href", withWs(path));
    }
  });
  ${
    options.requireWorkspace
      ? `
  if (!workspaceId) {
    if (banner) banner.hidden = false;
    if (main) main.innerHTML = '<p class="muted">Waiting for <code>workspaceId</code>.</p>';
    return;
  }
  if (banner) banner.hidden = true;
  `
      : `
  if (banner) banner.hidden = !!workspaceId;
  `
  }
  ${options.onReady}
})();
</script>`;
}

function tableShell(id: string, headers: string[]): string {
  const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  return `
<div id="${escapeHtml(id)}-status" class="muted" aria-live="polite"></div>
<table id="${escapeHtml(id)}" class="data">
  <thead><tr>${th}</tr></thead>
  <tbody></tbody>
</table>`;
}

export function renderOverviewBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Overview</h2>
  <p>Workspace summary — identities, grants, signals, receipts, and pending approvals (PRODUCT §11.1).</p>
  <dl id="overview-counts" class="counts">
    <div><dt>Identities</dt><dd id="count-identities">—</dd></div>
    <div><dt>Grants</dt><dd id="count-grants">—</dd></div>
    <div><dt>Connections</dt><dd id="count-connections">—</dd></div>
    <div><dt>Signals</dt><dd id="count-signals">—</dd></div>
    <div><dt>Receipts</dt><dd id="count-receipts">—</dd></div>
    <div><dt>Pending approvals</dt><dd id="count-approvals">—</dd></div>
  </dl>
  <p id="overview-notes" class="muted"></p>
  <p><a href="/onboarding">Onboarding checklist</a> · <a href="/receipts">Receipt inspector</a></p>
</section>
${workspaceClientBoot({
  apiBase,
  requireWorkspace: true,
  onReady: `
  const notes = [];
  async function getJson(path) {
    const res = await fetch(apiBase + path);
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  }
  (async function () {
    const grants = await getJson("/v1/grants?workspaceId=" + encodeURIComponent(workspaceId));
    document.getElementById("count-grants").textContent =
      grants.ok && grants.data && Array.isArray(grants.data.grants) ? String(grants.data.grants.length) : "—";

    const receipts = await getJson("/v1/receipts?workspaceId=" + encodeURIComponent(workspaceId));
    document.getElementById("count-receipts").textContent =
      receipts.ok && receipts.data && Array.isArray(receipts.data.receipts) ? String(receipts.data.receipts.length) : "—";

    const conns = await getJson("/v1/workspaces/" + encodeURIComponent(workspaceId) + "/connections");
    document.getElementById("count-connections").textContent =
      conns.ok && conns.data && Array.isArray(conns.data.connections) ? String(conns.data.connections.length) : "—";

    const approvals = await getJson("/v1/approvals?status=pending&workspaceId=" + encodeURIComponent(workspaceId));
    const approvalRows = approvals.ok && approvals.data
      ? (approvals.data.requests || approvals.data.approvals)
      : null;
    if (Array.isArray(approvalRows)) {
      document.getElementById("count-approvals").textContent = String(approvalRows.length);
    } else if (approvals.status === 404 || approvals.status === 405 || approvals.status === 501) {
      document.getElementById("count-approvals").textContent = "0";
      notes.push("Approvals list endpoint not available yet (SEC-012).");
    } else {
      document.getElementById("count-approvals").textContent = "—";
      if (!approvals.ok) notes.push("Approvals: HTTP " + approvals.status);
    }

    document.getElementById("count-identities").textContent = "—";
    notes.push("Identities: no workspace list GET yet — register via POST /v1/workspaces/{id}/identities.");
    document.getElementById("count-signals").textContent = "—";
    notes.push("Signals: list by correlationId via GET /v1/signals?correlationId=.");
    document.getElementById("overview-notes").textContent = notes.join(" ");
  })().catch(function (e) {
    document.getElementById("overview-notes").textContent = String(e);
  });
  `,
})}`;
}

export function renderIdentitiesBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Identities</h2>
  <p>Manage human, agent, service, and organization identities. List-by-workspace GET is not shipped yet;
  register via the API, then fetch by address.</p>
  <ul>
    <li><code>POST /v1/workspaces/{workspaceId}/identities</code></li>
    <li><code>GET /v1/identities/{address}</code></li>
    <li><code>GET /v1/identities/{address}/capabilities?workspaceId=</code></li>
  </ul>
  <p>Walk through registration in <a href="/onboarding">onboarding</a> or
  <a href="${escapeHtml(QUICKSTART_DOC)}">docs/QUICKSTART.md</a>.</p>
</section>
${workspaceClientBoot({ apiBase, requireWorkspace: false, onReady: "" })}`;
}

export function renderConnectionsBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Connections</h2>
  <p>Workspace GitHub connections (credential refs only — tokens never appear here).</p>
  ${tableShell("conn-table", ["connectionId", "provider", "installationId", "credentialRef", "createdAt"])}
</section>
${workspaceClientBoot({
  apiBase,
  requireWorkspace: true,
  onReady: `
  const status = document.getElementById("conn-table-status");
  const tbody = document.querySelector("#conn-table tbody");
  status.textContent = "Loading…";
  fetch(apiBase + "/v1/workspaces/" + encodeURIComponent(workspaceId) + "/connections")
    .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
    .then(function (r) {
      if (!r.res.ok) {
        status.innerHTML = '<span class="error">HTTP ' + r.res.status + '</span>';
        return;
      }
      const rows = r.data.connections || [];
      status.textContent = rows.length + " connection(s)";
      tbody.innerHTML = rows.map(function (c) {
        return "<tr><td>" + esc(c.connectionId) + "</td><td>" + esc(c.provider) + "</td><td>" +
          esc(c.installationId) + "</td><td>" + esc(c.credentialRef) + "</td><td>" + esc(c.createdAt) + "</td></tr>";
      }).join("") || "<tr><td colspan='5'>No connections</td></tr>";
    })
    .catch(function (e) { status.innerHTML = '<span class="error">' + esc(e) + '</span>'; });
  `,
})}`;
}

export function renderSignalsBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Signals</h2>
  <p>Inspect signals by correlation thread (<code>GET /v1/signals?correlationId=</code>).</p>
  <form id="signal-form">
    <label>correlationId <input name="correlationId" required placeholder="sig_…" /></label>
    <button type="submit">Load</button>
  </form>
  ${tableShell("signal-table", ["signalId", "category", "sender", "ackState", "executionState"])}
</section>
${workspaceClientBoot({
  apiBase,
  requireWorkspace: false,
  onReady: `
  const form = document.getElementById("signal-form");
  const status = document.getElementById("signal-table-status");
  const tbody = document.querySelector("#signal-table tbody");
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const cid = new FormData(form).get("correlationId");
    status.textContent = "Loading…";
    fetch(apiBase + "/v1/signals?correlationId=" + encodeURIComponent(String(cid)))
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (r) {
        if (!r.res.ok) {
          status.innerHTML = '<span class="error">' + esc(r.data.error || r.res.status) + '</span>';
          return;
        }
        const rows = r.data.signals || [];
        status.textContent = rows.length + " signal(s)";
        tbody.innerHTML = rows.map(function (row) {
          const s = row.signal || {};
          const d = row.delivery || {};
          const env = s.envelope || {};
          return "<tr><td>" + esc(s.signalId) + "</td><td>" + esc(env.category || "") + "</td><td>" +
            esc(env.sender || "") + "</td><td>" + esc(d.ackState || "") + "</td><td>" +
            esc(d.executionState || "") + "</td></tr>";
        }).join("") || "<tr><td colspan='5'>No signals</td></tr>";
      })
      .catch(function (e) { status.innerHTML = '<span class="error">' + esc(e) + '</span>'; });
  });
  `,
})}`;
}

export function renderPermissionsBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Permissions</h2>
  <p>Active and revoked grants for this workspace (<code>GET /v1/grants?workspaceId=</code>).</p>
  ${tableShell("grant-table", ["grantId", "subject", "resource", "action", "requiresApproval", "revokedAt"])}
</section>
${workspaceClientBoot({
  apiBase,
  requireWorkspace: true,
  onReady: `
  const status = document.getElementById("grant-table-status");
  const tbody = document.querySelector("#grant-table tbody");
  status.textContent = "Loading…";
  fetch(apiBase + "/v1/grants?workspaceId=" + encodeURIComponent(workspaceId))
    .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
    .then(function (r) {
      if (!r.res.ok) {
        status.innerHTML = '<span class="error">HTTP ' + r.res.status + '</span>';
        return;
      }
      const rows = r.data.grants || [];
      status.textContent = rows.length + " grant(s)";
      tbody.innerHTML = rows.map(function (g) {
        return "<tr><td>" + esc(g.grantId) + "</td><td>" + esc(g.subject) + "</td><td>" +
          esc(g.resource) + "</td><td>" + esc(g.action) + "</td><td>" + esc(g.requiresApproval) +
          "</td><td>" + esc(g.revokedAt || "") + "</td></tr>";
      }).join("") || "<tr><td colspan='6'>No grants</td></tr>";
    })
    .catch(function (e) { status.innerHTML = '<span class="error">' + esc(e) + '</span>'; });
  `,
})}`;
}

export function renderApprovalsBody(apiBase: string): string {
  return `
${workspaceBannerHtml()}
<section id="dash-main">
  <h2>Approvals</h2>
  <p>Pending approval inbox (<code>GET /v1/approvals?status=pending</code>). SEC-012 may land in parallel.</p>
  ${tableShell("approval-table", ["approvalId", "grantId", "subject", "resource", "action", "status"])}
  <p id="approval-note" class="muted"></p>
</section>
${workspaceClientBoot({
  apiBase,
  requireWorkspace: true,
  onReady: `
  const status = document.getElementById("approval-table-status");
  const note = document.getElementById("approval-note");
  const tbody = document.querySelector("#approval-table tbody");
  status.textContent = "Loading…";
  const q = "/v1/approvals?status=pending&workspaceId=" + encodeURIComponent(workspaceId);
  fetch(apiBase + q)
    .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }).catch(function () { return { res: res, data: {} }; }); })
    .then(function (r) {
      if (r.res.status === 404 || r.res.status === 405 || r.res.status === 501 || r.res.status === 400) {
        status.textContent = "0 pending";
        tbody.innerHTML = "<tr><td colspan='6'>No pending approvals</td></tr>";
        note.textContent = "Approvals list endpoint is not available yet (Open ID SEC-012). Inbox will populate when GET /v1/approvals ships.";
        return;
      }
      if (!r.res.ok) {
        status.innerHTML = '<span class="error">HTTP ' + r.res.status + '</span>';
        tbody.innerHTML = "<tr><td colspan='6'>No pending approvals</td></tr>";
        note.textContent = "Could not load approvals; showing empty inbox.";
        return;
      }
      const rows = r.data.approvals || r.data.requests || [];
      status.textContent = rows.length + " pending";
      tbody.innerHTML = rows.map(function (a) {
        return "<tr><td>" + esc(a.approvalId || a.requestId || "") + "</td><td>" + esc(a.grantId) +
          "</td><td>" + esc(a.subject) + "</td><td>" + esc(a.resource) + "</td><td>" + esc(a.action) +
          "</td><td>" + esc(a.status || "pending") + "</td></tr>";
      }).join("") || "<tr><td colspan='6'>No pending approvals</td></tr>";
    })
    .catch(function (e) {
      status.textContent = "0 pending";
      tbody.innerHTML = "<tr><td colspan='6'>No pending approvals</td></tr>";
      note.textContent = "Approvals unavailable: " + String(e);
    });
  `,
})}`;
}

export function renderDevelopersBody(apiBase: string): string {
  const mcpSnippet = `{
  "mcpServers": {
    "acpp": {
      "command": "node",
      "args": ["/ABS/PATH/TO/acpp/packages/acpp-mcp-host/dist/cli.js"],
      "env": { "ACPP_EMBEDDED": "1" }
    }
  }
}`;
  return `
<section id="dash-main">
  <h2>Developers</h2>
  <p>API credentials, protocol docs, SDK, and host install (PRODUCT §11.1 Developers).</p>
  <ul>
    <li>OpenAPI: <a href="${escapeHtml(apiBase)}/v1/openapi.json"><code>${escapeHtml(apiBase)}/v1/openapi.json</code></a></li>
    <li>Quickstart: <a href="${escapeHtml(QUICKSTART_DOC)}"><code>docs/QUICKSTART.md</code></a></li>
    <li>Wedge narrative: <a href="${escapeHtml(WEDGE_DOC)}"><code>docs/WEDGE.md</code></a></li>
    <li>SDK package: <code>@acpp/sdk</code> — <a href="${escapeHtml(DOCS.sdk)}">protocol/sdk.md</a></li>
    <li>MCP host install: <a href="${escapeHtml(MCP_HOST_DOC)}"><code>docs/protocol/mcp-host.md</code></a></li>
  </ul>
  <h3>Cursor MCP host snippet</h3>
  <pre class="code"><code>${escapeHtml(mcpSnippet)}</code></pre>
  <p class="muted">Replace the absolute path after <code>pnpm --filter @acpp/mcp-host build</code>.</p>
</section>`;
}

/** PRODUCT §11.2 steps 1–8 as a guided checklist ending at Receipts. */
export function renderOnboardingBody(): string {
  const steps: { title: string; detail: string; href?: string }[] = [
    {
      title: "Create an account or authenticate",
      detail: "Local API has no hosted login — start the API and treat the process as your session.",
      href: QUICKSTART_DOC,
    },
    {
      title: "Create a workspace",
      detail: "POST /v1/workspaces (see quickstart).",
      href: QUICKSTART_DOC,
    },
    {
      title: "Register the first agent identity",
      detail: "POST /v1/workspaces/{id}/identities with an Ed25519 public key.",
      href: QUICKSTART_DOC,
    },
    {
      title: "Establish verification credentials",
      detail: "Keep the private key local; sign signals with @acpp/identity / @acpp/signals.",
      href: DOCS.sdk,
    },
    {
      title: "Connect one supported tool",
      detail: "GitHub once per workspace: POST /v1/workspaces/{id}/connections/github (or use the stub demo).",
      href: `${GITHUB_REPO}/blob/main/docs/protocol/connections.md`,
    },
    {
      title: "Grant a narrowly scoped permission",
      detail: "POST /v1/grants for resource + action (WEDGE step 3).",
      href: WEDGE_DOC,
    },
    {
      title: "Send a test signal or request",
      detail: "POST /v1/signals, then evaluate + execute (quickstart allow path).",
      href: QUICKSTART_DOC,
    },
    {
      title: "Observe the decision and receipt",
      detail: "Open the Receipts inspector and run the wedge revoke-then-deny proof.",
      href: "/receipts",
    },
  ];

  const items = steps
    .map((step, i) => {
      const link = step.href
        ? ` <a href="${escapeHtml(step.href)}">${step.href.startsWith("/") ? "Open" : "Docs"}</a>`
        : "";
      return `<li class="onboard-step">
  <label><input type="checkbox" data-step="${i + 1}" /> <strong>${i + 1}. ${escapeHtml(step.title)}</strong></label>
  <p>${escapeHtml(step.detail)}${link}</p>
</li>`;
    })
    .join("");

  return `
<section id="dash-main" class="onboarding">
  <h2>Onboarding — wedge TTFV</h2>
  <p>Guided first-time flow (PRODUCT §11.2 / <a href="${escapeHtml(WEDGE_DOC)}">WEDGE.md</a>).
  Steps call the HTTP API via <a href="${escapeHtml(QUICKSTART_DOC)}">docs/QUICKSTART.md</a>;
  this page is the checklist — finish at Receipts.</p>
  <ol class="onboard-list">${items}</ol>
  <p class="finish"><a class="cta" href="/receipts">Finish at Receipts →</a></p>
  <p class="muted">After <code>pnpm quickstart</code>, paste the returned <code>workspaceId</code> into dashboard URLs
  (e.g. <code>/dashboard?workspaceId=ws_…</code>).</p>
</section>
<script>
(function () {
  const key = "acpp-onboarding-checks";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) {}
  document.querySelectorAll("input[data-step]").forEach(function (el) {
    const id = el.getAttribute("data-step");
    el.checked = !!saved[id];
    el.addEventListener("change", function () {
      saved[id] = el.checked;
      localStorage.setItem(key, JSON.stringify(saved));
    });
  });
})();
</script>`;
}

export const DASHBOARD_ROUTES = [
  "/dashboard",
  "/identities",
  "/connections",
  "/signals",
  "/permissions",
  "/approvals",
  "/receipts",
  "/developers",
  "/onboarding",
] as const;

export type DashboardRoute = (typeof DASHBOARD_ROUTES)[number];

export function isDashboardRoute(path: string): path is DashboardRoute {
  return (DASHBOARD_ROUTES as readonly string[]).includes(path);
}

/** Map dashboard path → HTML body (P-031). Landing `/` stays separate. */
export function renderDashboardRouteBody(pathName: string, apiBase: string): string | null {
  if (!isDashboardRoute(pathName)) return null;
  switch (pathName) {
    case "/dashboard":
      return renderOverviewBody(apiBase);
    case "/identities":
      return renderIdentitiesBody(apiBase);
    case "/connections":
      return renderConnectionsBody(apiBase);
    case "/signals":
      return renderSignalsBody(apiBase);
    case "/permissions":
      return renderPermissionsBody(apiBase);
    case "/approvals":
      return renderApprovalsBody(apiBase);
    case "/receipts":
      return renderReceiptsPage(apiBase);
    case "/developers":
      return renderDevelopersBody(apiBase);
    case "/onboarding":
      return renderOnboardingBody();
    default:
      return null;
  }
}
