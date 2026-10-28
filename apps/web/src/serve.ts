import { createServer } from "node:http";
import { renderOnboardingPage } from "./onboarding.js";
import { renderDashboardPage } from "./inspector.js";
import { renderSectionBody } from "./sections.js";
import { DASHBOARD_NAV, navItemForPath, pageTitle } from "./shell.js";

const port = Number(process.env.PORT ?? 3000);
const apiBase = process.env.ACPP_API_URL ?? "http://127.0.0.1:8787";

createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  let body: string;
  let activePath = path;

  if (path === "/onboarding") {
    body = renderOnboardingPage(apiBase);
    activePath = "/onboarding";
  } else {
    const item = navItemForPath(path);
    if (!item) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    body = renderSectionBody(item, apiBase);
    activePath = item.path;
  }

  const html = renderDashboardPage({
    title: pageTitle(),
    nav: DASHBOARD_NAV,
    body,
    apiBase,
    activePath,
  });

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(port, () => {
  console.log(`acpp web listening on :${port} (API ${apiBase})`);
});
