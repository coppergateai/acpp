import { SITE_META, SITE_URL } from "./constants.js";
import { landingClientScript } from "./client.js";
import { landingStyles } from "./styles.js";
import {
  renderArchitecture,
  renderDevelopers,
  renderExample,
  renderFinalCta,
  renderFooter,
  renderHero,
  renderHowItWorks,
  renderIntegrations,
  renderNav,
  renderPrinciples,
  renderScenario,
} from "./sections.js";
import { escapeHtml } from "../inspector.js";

export function renderLandingPage(): string {
  const title = SITE_META.title;
  const description = SITE_META.description;
  const canonical = `${SITE_URL}/`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#070B14" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="ACPP" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>${landingStyles()}</style>
</head>
<body>
  <a class="skip-link" href="#top">Skip to content</a>
  ${renderNav()}
  <main>
    ${renderHero()}
    ${renderPrinciples()}
    ${renderScenario()}
    ${renderHowItWorks()}
    ${renderDevelopers()}
    ${renderExample()}
    ${renderIntegrations()}
    ${renderArchitecture()}
    ${renderFinalCta()}
  </main>
  ${renderFooter()}
  <script>${landingClientScript()}</script>
</body>
</html>`;
}
