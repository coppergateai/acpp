import {
  DOCS,
  GITHUB_REPO,
  INTEGRATIONS,
  PROTOCOL_LAYERS,
  SCENARIO,
  SDK_CODE_SAMPLE,
  WEDGE_STEPS,
} from "./constants.js";
import { renderMark, renderWordmark } from "./mark.js";
import { escapeHtml } from "../inspector.js";

function highlightTs(source: string): string {
  const escaped = escapeHtml(source);
  return escaped
    .replace(
      /(\/\/.*)/g,
      '<span class="cm">$1</span>',
    )
    .replace(
      /\b(import|from|const|await|new|return)\b/g,
      '<span class="kw">$1</span>',
    )
    .replace(
      /(&quot;[^&]*&quot;)/g,
      '<span class="str">$1</span>',
    )
    .replace(
      /\b(createActorAddress|generateEd25519KeyPair|signSignalEnvelope|verifySignalEnvelopeSignature|AcppHostedClient|submitSignal)\b/g,
      '<span class="fn">$1</span>',
    );
}

function protocolViz(): string {
  // Orbit around central ACPP node — identity & authorization kept visually distinct.
  const nodes = [
    { label: "Identity", x: 210, y: 36, icon: "id" },
    { label: "Discovery", x: 348, y: 108, icon: "search" },
    { label: "Signals", x: 348, y: 232, icon: "signal" },
    { label: "Authorization", x: 210, y: 300, icon: "shield" },
    { label: "Action", x: 72, y: 232, icon: "bolt" },
    { label: "Receipts", x: 72, y: 108, icon: "doc" },
  ];
  const cx = 210;
  const cy = 168;
  const icons: Record<string, string> = {
    id: `<circle cx="0" cy="0" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="0" cy="0" r="1.1" fill="currentColor"/>`,
    search: `<circle cx="-1" cy="-1" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.2 1.2 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
    signal: `<path d="M-4 1.5c2-3 6-3 8 0M-2.2 2.8c1.2-1.8 3.2-1.8 4.4 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="0" cy="4" r="1.1" fill="currentColor"/>`,
    shield: `<path d="M0-4.5 4-2.5v3.2c0 2.4-1.6 3.8-4 4.8-2.4-1-4-2.4-4-4.8v-3.2Z" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
    bolt: `<path d="M1.2-4.5-3.2.8h3L-1.2 4.5 3.5-.5h-3Z" fill="currentColor"/>`,
    doc: `<rect x="-3.2" y="-4.2" width="6.4" height="8.4" rx="1.1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M-1.4-1.2h2.8M-1.4.8h2.8M-1.4 2.8h1.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
  };
  const links = nodes
    .map(
      (n, i) =>
        `<line class="viz-link" x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" />` +
        `<line class="viz-pulse" x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" style="animation-delay:${(i * 0.45).toFixed(2)}s" />`,
    )
    .join("");
  const nodeEls = nodes
    .map(
      (n) =>
        `<g transform="translate(${n.x}, ${n.y})">` +
        `<rect class="viz-node" x="-58" y="-22" width="116" height="44" rx="12"/>` +
        `<g class="viz-icon" transform="translate(-40, 0)" color="#4F8CFF">${icons[n.icon] ?? ""}</g>` +
        `<text class="viz-node-label" x="8" y="1" text-anchor="start" dominant-baseline="central">${escapeHtml(n.label)}</text>` +
        `</g>`,
    )
    .join("");

  return `
<div class="protocol-viz" role="img" aria-label="ACPP protocol node connecting Identity, Discovery, Signals, Authorization, Action, and Receipts. Flow: Agent to Identity to Permission to Action to Receipt.">
  <svg class="viz-canvas" viewBox="0 0 420 340" role="presentation">
    <defs>
      <radialGradient id="vizGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4F8CFF" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4F8CFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="78" fill="url(#vizGlow)"/>
    ${links}
    <g transform="translate(${cx}, ${cy})">
      <polygon class="viz-center" points="0,-48 42,-24 42,24 0,48 -42,24 -42,-24"/>
      <polygon class="viz-center-inner" points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14"/>
      <circle class="viz-center-dot" cx="0" cy="0" r="4"/>
      <text class="viz-center-label" y="56" text-anchor="middle">ACPP</text>
    </g>
    ${nodeEls}
  </svg>
  <div class="flow-strip">
    <span class="flow-chip"><strong>Agent</strong></span>
    <span class="flow-chip sep" aria-hidden="true">→</span>
    <span class="flow-chip"><strong>Identity</strong></span>
    <span class="flow-chip sep" aria-hidden="true">→</span>
    <span class="flow-chip"><strong>Permission</strong></span>
    <span class="flow-chip sep" aria-hidden="true">→</span>
    <span class="flow-chip"><strong>Action</strong></span>
    <span class="flow-chip sep" aria-hidden="true">→</span>
    <span class="flow-chip"><strong>Receipt</strong></span>
  </div>
</div>`;
}

export function renderNav(): string {
  return `
<header class="site-header" id="site-header">
  <div class="nav-inner">
    ${renderWordmark()}
    <ul class="nav-links" role="list">
      <li><a href="#protocol">Protocol</a></li>
      <li><a href="#scenario">Scenario</a></li>
      <li><a href="#how-it-works">How It Works</a></li>
      <li><a href="#developers">Developers</a></li>
      <li><a href="#integrations">Integrations</a></li>
      <li><a href="${escapeHtml(DOCS.protocol)}">Documentation</a></li>
    </ul>
    <div class="nav-actions">
      <a class="btn btn-ghost" href="${escapeHtml(GITHUB_REPO)}" rel="noopener noreferrer">GitHub</a>
      <a class="btn btn-primary" href="${escapeHtml(DOCS.quickstart)}">Get Started</a>
      <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <a href="#protocol">Protocol</a>
    <a href="#scenario">Scenario</a>
    <a href="#how-it-works">How It Works</a>
    <a href="#developers">Developers</a>
    <a href="#integrations">Integrations</a>
    <a href="${escapeHtml(DOCS.protocol)}">Documentation</a>
    <a href="${escapeHtml(GITHUB_REPO)}" rel="noopener noreferrer">GitHub</a>
    <a class="btn btn-primary" href="${escapeHtml(DOCS.quickstart)}">Get Started</a>
  </div>
</header>`;
}

export function renderHero(): string {
  return `
<section class="hero" id="top">
  <div class="container hero-grid">
    <div>
      <p class="eyebrow">Open Protocol · Agent Identity &amp; Proof</p>
      <h1>Identity for AI agents.</h1>
      <p class="support">Verifiable identity. Explicit permissions. Accountable actions.</p>
      <p class="lead">ACPP gives AI agents a verifiable identity, makes permissions explicit, and creates evidence of consequential actions across connected systems.</p>
      <div class="hero-ctas">
        <a class="btn btn-primary" href="${escapeHtml(DOCS.quickstart)}">Get Started <span aria-hidden="true">→</span></a>
        <a class="btn btn-secondary" href="#protocol">Explore the Protocol</a>
      </div>
      <p class="hero-micro">Open protocol. Developer-first. Built for interoperable agent systems.</p>
    </div>
    ${protocolViz()}
  </div>
</section>`;
}

export function renderPrinciples(): string {
  return `
<section class="section section-light" id="protocol" aria-labelledby="principles-title">
  <div class="container">
    <p class="section-kicker">Trust principles</p>
    <h2 id="principles-title">Identity is not authority.</h2>
    <p class="section-lead">Three separations that keep agent systems accountable — grounded in PRODUCT §5.</p>
    <div class="principles">
      <article class="principle">
        <p class="neq">IDENTITY ≠ AUTHORITY</p>
        <h3>Identity ≠ Authority</h3>
        <p>Knowing which agent is acting does not automatically grant it permission. Every protected action is evaluated against an explicit grant.</p>
        <div class="principle-diagram" aria-hidden="true">
          <span>who</span><span class="x">≠</span><span>may act</span>
        </div>
      </article>
      <article class="principle">
        <p class="neq">DISCOVERY ≠ CONSENT</p>
        <h3>Discovery ≠ Consent</h3>
        <p>Finding an agent or capability does not authorize interaction or execution. Discovery returns only what policy already permits.</p>
        <div class="principle-diagram" aria-hidden="true">
          <span>find</span><span class="x">≠</span><span>consent</span>
        </div>
      </article>
      <article class="principle">
        <p class="neq">SIGNAL ≠ EXECUTION</p>
        <h3>Signal ≠ Execution</h3>
        <p>A signed signal communicates intent or information. Execution requires the authorization path — signals never bypass policy.</p>
        <div class="principle-diagram" aria-hidden="true">
          <span>intent</span><span class="x">≠</span><span>execute</span>
        </div>
      </article>
    </div>
  </div>
</section>`;
}

export function renderScenario(): string {
  const beats = SCENARIO.beats
    .map(
      (beat, i) => `
<li class="scenario-beat" style="--beat-i:${i}">
  <span class="scenario-beat-index" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
  <div>
    <p class="scenario-beat-who">${escapeHtml(beat.who)}</p>
    <p class="scenario-beat-what">${escapeHtml(beat.what)}</p>
  </div>
</li>`,
    )
    .join("");

  const { setting } = SCENARIO;

  return `
<section class="section section-dark section-elevated" id="scenario" aria-labelledby="scenario-title">
  <div class="container">
    <p class="section-kicker">${escapeHtml(SCENARIO.kicker)}</p>
    <h2 id="scenario-title">${escapeHtml(SCENARIO.title)}</h2>
    <p class="section-lead">${escapeHtml(SCENARIO.lead)}</p>
    <div class="scenario-layout">
      <ol class="scenario-beats" role="list">${beats}</ol>
      <aside class="scenario-stage" aria-label="Scenario setup">
        <p class="scenario-stage-label">Monday · payments repo</p>
        <h3>${escapeHtml(setting.issue)}</h3>
        <dl class="scenario-facts">
          <div><dt>Agent</dt><dd class="mono">${escapeHtml(setting.agent)}</dd></div>
          <div><dt>Resource</dt><dd class="mono">${escapeHtml(setting.resource)}</dd></div>
          <div><dt>Allowed</dt><dd class="mono">${escapeHtml(setting.action)}</dd></div>
          <div><dt>Not allowed</dt><dd class="mono">repos.write · deploy</dd></div>
        </dl>
        <p class="scenario-outcome"><span class="dot" aria-hidden="true"></span>Comment posted · receipt on file · revoke proves deny</p>
        <a class="scenario-link" href="#example">See the protocol steps →</a>
      </aside>
    </div>
  </div>
</section>`;
}

export function renderHowItWorks(): string {
  const layers = PROTOCOL_LAYERS.map(
    (layer) => `
<article class="layer" style="--layer-accent:${layer.accent}" id="layer-${escapeHtml(layer.id)}">
  <div class="layer-dot" aria-hidden="true"></div>
  <p class="layer-num">${escapeHtml(layer.num)}</p>
  <h3>${escapeHtml(layer.name)}</h3>
  <p>${escapeHtml(layer.summary)}</p>
  <span class="badge badge-${escapeHtml(layer.status)}">${escapeHtml(layer.statusLabel)}</span>
</article>`,
  ).join("");

  return `
<section class="section section-dark section-elevated" id="how-it-works" aria-labelledby="how-title">
  <div class="container">
    <p class="section-kicker">How ACPP works</p>
    <h2 id="how-title">From agent identity to verifiable action.</h2>
    <p class="section-lead">A protocol layer that separates identity, intent, authorization, execution, and evidence. Status labels reflect what ships in this repository today.</p>
    <div class="layers">${layers}</div>
    <p class="layers-mobile-note">Swipe to explore each protocol layer.</p>
  </div>
</section>`;
}

export function renderDevelopers(): string {
  return `
<section class="section section-dark" id="developers" aria-labelledby="dev-title">
  <div class="container">
    <p class="section-kicker">Developer experience</p>
    <h2 id="dev-title">A protocol you can build on.</h2>
    <p class="section-lead">Reference TypeScript SDK in the monorepo (<code class="mono">@acpp/sdk</code>). Packages are workspace-private today — clone the repo and run the local API.</p>
    <div class="dev-grid">
      <div class="code-panel">
        <div class="code-toolbar">
          <span class="lang">TypeScript · docs/protocol/sdk.md</span>
          <button type="button" class="icon-btn" id="copy-code" data-copy-target="sdk-sample">Copy</button>
        </div>
        <pre class="code-body" id="sdk-sample" tabindex="0"><code>${highlightTs(SDK_CODE_SAMPLE)}</code></pre>
        <script type="text/plain" id="sdk-sample-raw">${SDK_CODE_SAMPLE.replace(/</g, "\\u003c")}</script>
      </div>
      <aside class="dev-aside">
        <h3>Local quickstart</h3>
        <p>Prove allow and deny on your machine — no GitHub token required for the stub demo.</p>
        <ol>
          <li><code class="mono">pnpm install</code></li>
          <li><code class="mono">pnpm --filter @acpp/api dev</code></li>
          <li><code class="mono">pnpm --filter @acpp/example-quickstart demo</code></li>
        </ol>
        <a class="btn btn-secondary" href="${escapeHtml(DOCS.quickstart)}">Read the quickstart</a>
        <a class="btn btn-ghost" href="${escapeHtml(DOCS.sdk)}" style="margin-left:0.35rem">SDK reference</a>
      </aside>
    </div>
  </div>
</section>`;
}

export function renderExample(): string {
  const steps = WEDGE_STEPS.map(
    (step, i) => `
<button type="button" class="step-tab" role="tab" id="wedge-tab-${i}" aria-selected="${i === 0 ? "true" : "false"}" aria-controls="wedge-panel" data-step="${i}">
  <span class="step-index">${String(i + 1).padStart(2, "0")}</span>
  <span>
    <strong>${escapeHtml(step.title)}</strong>
    <span class="detail">${escapeHtml(step.detail)}</span>
  </span>
</button>`,
  ).join("");

  const first = WEDGE_STEPS[0]!;

  return `
<section class="section section-light" id="example" aria-labelledby="example-title">
  <div class="container">
    <p class="section-kicker">Protocol walkthrough</p>
    <h2 id="example-title">From request to verified receipt.</h2>
    <p class="section-lead">Same triage story as API steps: register → connect GitHub → authorize → signal → receipt → revoke → deny.</p>
    <span class="demo-note">Demonstration sequence · mirrors docs/WEDGE.md and local demos</span>
    <div class="example-grid">
      <div role="tablist" aria-label="Wedge steps" class="timeline">${steps}</div>
      <div class="receipt-card" id="wedge-panel" role="tabpanel" aria-labelledby="wedge-tab-0">
        <h3 id="wedge-panel-title">${escapeHtml(first.title)}</h3>
        <p id="wedge-panel-detail" style="margin:0.65rem 0 0;color:#5B657A;font-size:0.95rem">${escapeHtml(first.detail)}</p>
        <dl class="receipt-meta">
          <div><dt>Route</dt><dd id="wedge-panel-meta">${escapeHtml(first.meta)}</dd></div>
          <div><dt>Agent</dt><dd class="mono">acpp:agent:…</dd></div>
          <div><dt>Resource</dt><dd class="mono">github:repo:org/repo</dd></div>
          <div><dt>Action</dt><dd class="mono">issues.comment</dd></div>
        </dl>
        <div class="receipt-status"><span class="dot" aria-hidden="true"></span><span id="wedge-panel-status">Step ready</span></div>
        <p style="margin:1rem 0 0;font-size:0.85rem;color:#7A8499">Try the live inspector after starting the API: <a href="/receipts" style="color:#3B6FE0">/receipts</a></p>
      </div>
    </div>
  </div>
</section>
<script type="application/json" id="wedge-data">${JSON.stringify(WEDGE_STEPS).replace(/</g, "\\u003c")}</script>`;
}

export function renderIntegrations(): string {
  const cards = INTEGRATIONS.map(
    (item) => `
<article class="integration">
  <div class="integration-top">
    <h3>${escapeHtml(item.name)}</h3>
    <span class="badge badge-${escapeHtml(item.status)}">${escapeHtml(item.statusLabel)}</span>
  </div>
  <p>${escapeHtml(item.blurb)}</p>
  <a class="more" href="${escapeHtml(item.href)}" rel="noopener noreferrer">Learn more →</a>
</article>`,
  ).join("");

  return `
<section class="section section-dark section-elevated" id="integrations" aria-labelledby="integrations-title">
  <div class="container">
    <p class="section-kicker">Integrations</p>
    <h2 id="integrations-title">Designed to work across agent systems.</h2>
    <p class="section-lead">ACPP is a reusable protocol layer — not a lock-in to one agent framework. Status reflects this repository.</p>
    <div class="integrations">${cards}</div>
  </div>
</section>`;
}

export function renderArchitecture(): string {
  return `
<section class="section section-dark" id="architecture" aria-labelledby="arch-title">
  <div class="container">
    <p class="section-kicker">Protocol architecture</p>
    <h2 id="arch-title">A protocol layer, not another agent runtime.</h2>
    <p class="section-lead">Agent runtimes keep doing their work. ACPP supplies identity, signals, authorization, and proof around consequential actions.</p>
    <div class="arch" role="img" aria-label="Layered architecture: agent applications above ACPP above connected tools">
      <div class="arch-layer arch-apps">
        <strong>Agent applications / runtimes</strong>
        <span>Orchestrators, tools, and workflows you already run</span>
      </div>
      <div class="arch-arrow" aria-hidden="true">↓</div>
      <div class="arch-layer arch-acpp">
        <strong>ACPP — identity, signals, authorization &amp; proof</strong>
        <span>@acpp/identity · signals · policy · receipts · connectors</span>
      </div>
      <div class="arch-arrow" aria-hidden="true">↓</div>
      <div class="arch-layer arch-tools">
        <strong>Connected tools &amp; external systems</strong>
        <span>GitHub today · MCP path experimental · more connectors later</span>
      </div>
    </div>
  </div>
</section>`;
}

export function renderFinalCta(): string {
  return `
<section class="final-cta" aria-labelledby="final-title">
  <div class="container">
    ${renderMark({ size: 40, className: "final-mark" })}
    <h2 id="final-title" style="margin-top:1.25rem">Give your agents a real identity.</h2>
    <p>Make agent identity verifiable, permissions explicit, and consequential actions accountable.</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="${escapeHtml(DOCS.quickstart)}">Get Started <span aria-hidden="true">→</span></a>
      <a class="btn btn-secondary" href="${escapeHtml(GITHUB_REPO)}" rel="noopener noreferrer">Explore on GitHub</a>
    </div>
  </div>
</section>`;
}

export function renderFooter(): string {
  const year = new Date().getFullYear();
  return `
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      ${renderWordmark({ size: 26 })}
      <p>Open identity, authorization, and proof protocol for AI agents. Community / self-host first.</p>
    </div>
    <div class="footer-col">
      <h4>Protocol</h4>
      <ul>
        <li><a href="#protocol">Principles</a></li>
        <li><a href="#scenario">Scenario</a></li>
        <li><a href="#how-it-works">How it works</a></li>
        <li><a href="#architecture">Architecture</a></li>
        <li><a href="${escapeHtml(DOCS.product)}">PRODUCT.md</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Developers</h4>
      <ul>
        <li><a href="${escapeHtml(DOCS.quickstart)}">Quickstart</a></li>
        <li><a href="${escapeHtml(DOCS.sdk)}">SDK</a></li>
        <li><a href="${escapeHtml(DOCS.protocol)}">Documentation</a></li>
        <li><a href="${escapeHtml(GITHUB_REPO)}">GitHub</a></li>
        <li><a href="#integrations">Integrations</a></li>
        <li><a href="/receipts">Receipt inspector</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© ${year} Coppergate / ACPP</span>
    <span><a href="${escapeHtml(DOCS.license)}">MIT License</a></span>
  </div>
</footer>`;
}
