/** Design tokens + landing stylesheet. */

export function landingStyles(): string {
  return `
:root {
  --ink: #070B14;
  --ink-elevated: #0C1220;
  --ink-soft: #121A2B;
  --line: rgba(148, 163, 184, 0.16);
  --line-strong: rgba(148, 163, 184, 0.28);
  --paper: #F6F7FA;
  --paper-pure: #FFFFFF;
  --muted: #8B93A7;
  --muted-strong: #A8B0C2;
  --text: #E8ECF4;
  --text-dark: #0F172A;
  --accent: #4F8CFF;
  --accent-soft: rgba(79, 140, 255, 0.14);
  --accent-glow: rgba(79, 140, 255, 0.35);
  --success: #2FA36B;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
  --font: "Outfit", "IBM Plex Sans", system-ui, sans-serif;
  --font-body: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --max: 1120px;
  --nav-h: 68px;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  color: var(--text);
  background: var(--ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

img, svg { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { font: inherit; }
code, .mono { font-family: var(--font-mono); }

.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  background: var(--accent);
  color: #fff;
  padding: 0.5rem 1rem;
  z-index: 100;
}
.skip-link:focus { left: 1rem; top: 1rem; }

.container {
  width: min(100% - 2.5rem, var(--max));
  margin-inline: auto;
}

/* —— Brand mark —— */
.acpp-mark-fill { fill: #0B1220; }
.acpp-mark-stroke { fill: none; stroke: var(--accent); }
.acpp-mark-node { fill: var(--accent); }
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-family: var(--font);
  font-weight: 600;
  letter-spacing: -0.03em;
  font-size: 1.05rem;
}
.brand-word { color: var(--text); }
.site-header.on-light .brand-word { color: var(--text-dark); }
.site-header.on-light .acpp-mark-fill { fill: #EEF3FF; }

/* —— Buttons —— */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-family: var(--font);
  font-weight: 560;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 160ms var(--ease), border-color 160ms var(--ease), color 160ms var(--ease), transform 160ms var(--ease);
}
.btn:focus-visible, .nav-links a:focus-visible, .icon-btn:focus-visible, .step-tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.btn-primary {
  background: #fff;
  color: var(--ink);
}
.btn-primary:hover { background: #E8ECF4; }
.btn-secondary {
  background: transparent;
  border-color: var(--line-strong);
  color: var(--text);
}
.btn-secondary:hover { border-color: var(--muted-strong); background: rgba(255,255,255,0.04); }
.btn-ghost {
  background: transparent;
  color: var(--muted-strong);
}
.btn-ghost:hover { color: var(--text); }
.btn-dark {
  background: var(--ink);
  color: #fff;
}
.btn-dark:hover { background: #151D2E; }
.btn-outline-dark {
  border-color: rgba(15, 23, 42, 0.18);
  color: var(--text-dark);
  background: transparent;
}
.btn-outline-dark:hover { background: rgba(15,23,42,0.04); }

/* —— Header —— */
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  min-height: var(--nav-h);
  backdrop-filter: blur(14px);
  background: rgba(7, 11, 20, 0.72);
  border-bottom: 1px solid transparent;
  transition: background 200ms var(--ease), border-color 200ms var(--ease);
}
.site-header .nav-inner { min-height: var(--nav-h); }
.site-header.is-scrolled {
  border-bottom-color: var(--line);
  background: rgba(7, 11, 20, 0.88);
}
.site-header .nav-inner {
  width: min(100% - 2.5rem, var(--max));
  margin-inline: auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
}
.nav-links {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav-links a {
  color: var(--muted-strong);
  font-size: 0.92rem;
  font-weight: 500;
}
.nav-links a:hover { color: var(--text); }
.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.nav-actions .btn { min-height: 38px; padding: 0.45rem 1rem; font-size: 0.88rem; }
.nav-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.nav-toggle svg { width: 18px; height: 18px; }
.mobile-nav {
  display: none;
  border-top: 1px solid var(--line);
  background: rgba(7, 11, 20, 0.96);
  padding: 1rem 1.25rem 1.25rem;
}
.mobile-nav.open { display: block; }
.mobile-nav a {
  display: block;
  padding: 0.75rem 0.25rem;
  color: var(--muted-strong);
  border-bottom: 1px solid var(--line);
}
.mobile-nav a:last-child { border-bottom: 0; }
.mobile-nav .btn { width: 100%; margin-top: 0.75rem; }

@media (min-width: 920px) {
  .nav-links { display: flex; }
  .nav-toggle { display: none; }
  .mobile-nav { display: none !important; }
  .nav-actions .btn-ghost { display: inline-flex; }
}
@media (max-width: 919px) {
  .nav-inner { grid-template-columns: 1fr auto; }
  .nav-actions .btn-ghost { display: none; }
}

/* —— Hero —— */
.hero {
  position: relative;
  overflow: hidden;
  padding: 3.5rem 0 4.5rem;
  background:
    radial-gradient(ellipse 70% 55% at 70% 35%, rgba(79,140,255,0.18), transparent 60%),
    radial-gradient(ellipse 50% 40% at 20% 80%, rgba(79,140,255,0.08), transparent 55%),
    linear-gradient(180deg, #070B14 0%, #0A1020 100%);
}
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%);
  pointer-events: none;
}
.hero-grid {
  position: relative;
  display: grid;
  gap: 3rem;
  align-items: center;
}
@media (min-width: 980px) {
  .hero-grid { grid-template-columns: 1.05fr 0.95fr; gap: 2.5rem; }
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 1.1rem;
}
.hero h1 {
  margin: 0;
  font-family: var(--font);
  font-size: clamp(2.4rem, 5.2vw, 3.75rem);
  line-height: 1.05;
  letter-spacing: -0.045em;
  font-weight: 600;
  color: #fff;
}
.hero .support {
  margin: 1rem 0 0;
  font-family: var(--font);
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--muted-strong);
}
.hero .lead {
  margin: 1.25rem 0 0;
  max-width: 36rem;
  color: var(--muted);
  font-size: 1.02rem;
}
.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}
.hero-micro {
  margin-top: 1.25rem;
  color: var(--muted);
  font-size: 0.88rem;
}

/* —— Protocol viz —— */
.protocol-viz {
  position: relative;
  min-height: 360px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background:
    radial-gradient(circle at 50% 50%, rgba(79,140,255,0.16), transparent 45%),
    linear-gradient(160deg, rgba(18,26,43,0.9), rgba(10,16,32,0.95));
  overflow: hidden;
}
.protocol-viz svg.viz-canvas {
  width: 100%;
  height: auto;
  min-height: 360px;
}
.viz-node {
  fill: rgba(10, 14, 26, 0.94);
  stroke: rgba(79, 140, 255, 0.28);
  stroke-width: 1;
}
.viz-node-label {
  fill: #D5DBE8;
  font-family: var(--font);
  font-size: 11.5px;
  font-weight: 560;
}
.viz-icon { color: var(--accent); }
.viz-center {
  fill: #0B1220;
  stroke: var(--accent);
  stroke-width: 1.6;
  filter: drop-shadow(0 0 22px var(--accent-glow));
}
.viz-center-inner {
  fill: none;
  stroke: rgba(79, 140, 255, 0.45);
  stroke-width: 1;
}
.viz-center-dot { fill: var(--accent); }
.viz-center-label {
  fill: #fff;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.viz-link {
  fill: none;
  stroke: rgba(79,140,255,0.35);
  stroke-width: 1.25;
}
.viz-pulse {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
  stroke-dasharray: 4 120;
  stroke-linecap: round;
  animation: signal-pulse 3.6s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .viz-pulse { animation: none; stroke-dasharray: none; opacity: 0.45; }
}
@keyframes signal-pulse {
  to { stroke-dashoffset: -124; }
}
.flow-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  padding: 0 1rem 1.15rem;
  margin-top: -0.5rem;
}
.flow-chip {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--muted-strong);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.28rem 0.55rem;
  background: rgba(255,255,255,0.02);
}
.flow-chip strong { color: var(--text); font-weight: 560; }
.flow-chip .sep { color: var(--accent); margin: 0 0.15rem; }

/* —— Sections —— */
.section {
  padding: 5rem 0;
}
.section-dark {
  background: var(--ink);
  color: var(--text);
}
.section-light {
  background: var(--paper);
  color: var(--text-dark);
}
.section-elevated {
  background: var(--ink-elevated);
}
.section-kicker {
  margin: 0 0 0.75rem;
  font-family: var(--font);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}
.section-light .section-kicker { color: #3B6FE0; }
.section h2 {
  margin: 0;
  font-family: var(--font);
  font-size: clamp(1.75rem, 3.4vw, 2.45rem);
  line-height: 1.15;
  letter-spacing: -0.035em;
  font-weight: 600;
  max-width: 18ch;
}
.section-light h2 { color: var(--text-dark); }
.section .section-lead {
  margin: 0.9rem 0 0;
  max-width: 40rem;
  color: var(--muted);
  font-size: 1.05rem;
}
.section-light .section-lead { color: #5B657A; }

/* —— Principles —— */
.principles {
  display: grid;
  gap: 1rem;
  margin-top: 2.5rem;
}
@media (min-width: 800px) {
  .principles { grid-template-columns: repeat(3, 1fr); }
}
.principle {
  position: relative;
  padding: 1.5rem 1.4rem 1.55rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(15,23,42,0.08);
  background: var(--paper-pure);
  overflow: hidden;
}
.principle::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--accent);
}
.principle .neq {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #3B6FE0;
  letter-spacing: 0.04em;
  margin: 0 0 0.65rem;
}
.principle h3 {
  margin: 0;
  font-family: var(--font);
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  font-weight: 620;
}
.principle p {
  margin: 0.7rem 0 0;
  color: #5B657A;
  font-size: 0.95rem;
}
.principle-diagram {
  margin-top: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #7A8499;
}
.principle-diagram span {
  border: 1px solid rgba(15,23,42,0.1);
  border-radius: 6px;
  padding: 0.3rem 0.45rem;
  background: #F0F3F8;
}
.principle-diagram .x {
  color: #C44;
  border-color: transparent;
  background: transparent;
  padding: 0;
}

/* —— Layers —— */
.layers {
  margin-top: 2.5rem;
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 1100px) {
  .layers {
    grid-template-columns: repeat(7, 1fr);
    gap: 0.55rem;
  }
}
.layer {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 1rem 0.9rem 1.1rem;
  background: rgba(255,255,255,0.02);
  transition: border-color 160ms var(--ease), background 160ms var(--ease);
}
.layer:hover, .layer:focus-within {
  border-color: color-mix(in srgb, var(--layer-accent) 55%, transparent);
  background: rgba(255,255,255,0.035);
}
.layer-num {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--layer-accent);
  margin: 0 0 0.55rem;
}
.layer-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--layer-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--layer-accent) 22%, transparent);
  margin-bottom: 0.75rem;
}
.layer h3 {
  margin: 0;
  font-family: var(--font);
  font-size: 1rem;
  letter-spacing: -0.02em;
}
.layer p {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.45;
}
.badge {
  display: inline-flex;
  align-items: center;
  margin-top: 0.85rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.22rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--muted-strong);
}
.badge-available { color: #6EE7A8; border-color: rgba(47,163,107,0.35); background: rgba(47,163,107,0.08); }
.badge-partial { color: #F0C674; border-color: rgba(232,184,74,0.35); background: rgba(232,184,74,0.08); }
.badge-conceptual, .badge-planned { color: var(--muted); border-color: var(--line); }
.badge-experimental { color: #9DB7FF; border-color: rgba(79,140,255,0.35); background: var(--accent-soft); }

.layers-mobile-note {
  display: none;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--muted);
}
@media (max-width: 1099px) {
  .layers {
    grid-auto-flow: column;
    grid-auto-columns: minmax(210px, 78vw);
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .layer { scroll-snap-align: start; }
  .layers-mobile-note { display: block; }
}

/* —— Developers —— */
.dev-grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 2.5rem;
  align-items: stretch;
}
@media (min-width: 960px) {
  .dev-grid { grid-template-columns: 1.15fr 0.85fr; }
}
.code-panel {
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: #080D18;
  overflow: hidden;
  min-width: 0;
}
.code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
}
.code-toolbar .lang {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
}
.icon-btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted-strong);
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.icon-btn:hover { color: var(--text); border-color: var(--line-strong); }
.icon-btn.copied { color: var(--success); border-color: rgba(47,163,107,0.4); }
.code-body {
  margin: 0;
  padding: 1rem 0.9rem 1.2rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.55;
  color: #C9D2E3;
}
.code-body .kw { color: #7EB6FF; }
.code-body .str { color: #9AD4A8; }
.code-body .cm { color: #6B7388; }
.code-body .fn { color: #D4B483; }
.dev-aside {
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
  padding: 1.4rem 1.3rem;
}
.dev-aside h3 {
  margin: 0;
  font-family: var(--font);
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}
.dev-aside p { margin: 0.7rem 0 0; color: var(--muted); font-size: 0.95rem; }
.dev-aside ol {
  margin: 1.1rem 0 0;
  padding: 0 0 0 1.1rem;
  color: var(--muted-strong);
  font-size: 0.9rem;
}
.dev-aside li { margin: 0.4rem 0; }
.dev-aside .btn { margin-top: 1.25rem; }

/* —— Example timeline —— */
.example-grid {
  display: grid;
  gap: 1.5rem;
  margin-top: 2.5rem;
}
@media (min-width: 900px) {
  .example-grid { grid-template-columns: 1.1fr 0.9fr; }
}
.demo-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.85rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #3B6FE0;
  background: rgba(59,111,224,0.08);
  border: 1px solid rgba(59,111,224,0.18);
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: var(--radius-md);
  background: #fff;
  overflow: hidden;
}
.step-tab {
  width: 100%;
  text-align: left;
  border: 0;
  border-bottom: 1px solid rgba(15,23,42,0.06);
  background: transparent;
  padding: 0.95rem 1.1rem;
  cursor: pointer;
  color: var(--text-dark);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
}
.step-tab:last-child { border-bottom: 0; }
.step-tab[aria-selected="true"] {
  background: #F0F5FF;
}
.step-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: #3B6FE0;
  margin-top: 0.2rem;
}
.step-tab strong {
  display: block;
  font-family: var(--font);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.step-tab .detail {
  display: block;
  margin-top: 0.25rem;
  color: #5B657A;
  font-size: 0.85rem;
}
.receipt-card {
  border-radius: var(--radius-md);
  border: 1px solid rgba(15,23,42,0.08);
  background: #fff;
  padding: 1.35rem 1.25rem;
}
.receipt-card h3 {
  margin: 0;
  font-family: var(--font);
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
.receipt-meta {
  margin-top: 1rem;
  display: grid;
  gap: 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
.receipt-meta div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  background: #F4F6FA;
}
.receipt-meta dt { color: #7A8499; }
.receipt-meta dd { margin: 0; color: var(--text-dark); font-weight: 520; }
.receipt-status {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--success);
  font-weight: 560;
  font-size: 0.9rem;
}
.receipt-status .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 4px rgba(47,163,107,0.15);
}

/* —— Integrations —— */
.integrations {
  display: grid;
  gap: 1rem;
  margin-top: 2.5rem;
}
@media (min-width: 800px) {
  .integrations { grid-template-columns: repeat(3, 1fr); }
}
.integration {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 1.35rem 1.25rem;
  background: rgba(255,255,255,0.02);
}
.integration-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.integration h3 {
  margin: 0;
  font-family: var(--font);
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}
.integration p {
  margin: 0.75rem 0 0;
  color: var(--muted);
  font-size: 0.92rem;
}
.integration a.more {
  display: inline-block;
  margin-top: 1rem;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 520;
}
.integration a.more:hover { text-decoration: underline; }

/* —— Architecture —— */
.arch {
  margin-top: 2.5rem;
  display: grid;
  gap: 0.75rem;
  max-width: 640px;
}
.arch-layer {
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  padding: 1.15rem 1.25rem;
  text-align: center;
}
.arch-layer strong {
  display: block;
  font-family: var(--font);
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}
.arch-layer span { color: var(--muted); font-size: 0.88rem; }
.arch-apps { background: rgba(255,255,255,0.02); }
.arch-acpp {
  background: linear-gradient(180deg, rgba(79,140,255,0.12), rgba(79,140,255,0.04));
  border-color: rgba(79,140,255,0.35);
}
.arch-tools { background: rgba(255,255,255,0.02); }
.arch-arrow {
  text-align: center;
  color: var(--accent);
  font-size: 1.1rem;
  line-height: 1;
}

/* —— Final CTA —— */
.final-cta {
  position: relative;
  overflow: hidden;
  padding: 5.5rem 0;
  text-align: center;
  background:
    radial-gradient(ellipse 50% 70% at 85% 100%, rgba(79,140,255,0.22), transparent 55%),
    radial-gradient(ellipse 40% 50% at 10% 0%, rgba(79,140,255,0.1), transparent 50%),
    var(--ink);
}
.final-cta .final-mark { margin-inline: auto; }
.final-cta h2 {
  margin: 0 auto;
  max-width: 16ch;
  font-family: var(--font);
  font-size: clamp(2rem, 4vw, 2.8rem);
  letter-spacing: -0.04em;
  line-height: 1.1;
  font-weight: 600;
}
.final-cta p {
  margin: 1rem auto 0;
  max-width: 34rem;
  color: var(--muted);
}
.final-cta .hero-ctas { justify-content: center; }

/* —— Footer —— */
.site-footer {
  border-top: 1px solid var(--line);
  padding: 3rem 0 2.5rem;
  background: #05080F;
}
.footer-grid {
  display: grid;
  gap: 2rem;
}
@media (min-width: 800px) {
  .footer-grid { grid-template-columns: 1.4fr 1fr 1fr; }
}
.footer-brand p {
  margin: 0.85rem 0 0;
  color: var(--muted);
  max-width: 28rem;
  font-size: 0.92rem;
}
.footer-col h4 {
  margin: 0 0 0.85rem;
  font-family: var(--font);
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.footer-col ul { list-style: none; margin: 0; padding: 0; }
.footer-col li { margin: 0.45rem 0; }
.footer-col a { color: var(--muted-strong); font-size: 0.92rem; }
.footer-col a:hover { color: var(--text); }
.footer-bottom {
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.82rem;
}

@media (max-width: 480px) {
  .container, .site-header .nav-inner { width: min(100% - 1.5rem, var(--max)); }
  .hero { padding-top: 2.5rem; }
  .section { padding: 3.5rem 0; }
}
`;
}
