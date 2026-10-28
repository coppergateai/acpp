import { createServer } from "node:http";
import { DASHBOARD_NAV, pageTitle } from "./shell.js";
import { renderDashboardPage, renderReceiptsPage } from "./inspector.js";

const port = Number(process.env.PORT ?? 3000);
const apiBase = process.env.ACPP_API_URL ?? "http://127.0.0.1:8787";

createServer((req, res) => {
  const path = req.url?.split("?")[0] ?? "/";

  let body: string;
  if (path === "/receipts") {
    body = renderReceiptsPage(apiBase);
  } else {
    body = `<section><p>Workspace overview — use <a href="/receipts">Receipts</a> for the P-030 inspector and revoke-then-deny proof.</p></section>`;
  }

  const html = renderDashboardPage({
    title: pageTitle(),
    nav: DASHBOARD_NAV,
    body,
    apiBase,
  });

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(port, () => {
  console.log(`acpp web listening on :${port} (API ${apiBase})`);
});
