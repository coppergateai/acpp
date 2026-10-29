import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DASHBOARD_NAV, pageTitle } from "./shell.js";
import { renderDashboardPage } from "./inspector.js";
import { renderLandingPage } from "./landing/page.js";
import { renderDashboardRouteBody } from "./dashboard.js";

const port = Number(process.env.PORT ?? 3000);
const apiBase = process.env.ACPP_API_URL ?? "http://127.0.0.1:8787";
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const STATIC_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

async function tryServeStatic(urlPath: string): Promise<{ body: Buffer; type: string } | null> {
  if (!urlPath.startsWith("/") || urlPath.includes("\0") || urlPath.includes("..")) {
    return null;
  }
  const rel = decodeURIComponent(urlPath.slice(1));
  if (!rel || rel.includes("/") || rel.includes("\\")) return null;
  const filePath = path.resolve(publicDir, rel);
  if (!filePath.startsWith(publicDir + path.sep) && filePath !== publicDir) return null;
  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return { body, type: STATIC_TYPES[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const pathName = req.url?.split("?")[0] ?? "/";

  if (pathName === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderLandingPage());
    return;
  }

  const asset = await tryServeStatic(pathName);
  if (asset) {
    res.writeHead(200, {
      "content-type": asset.type,
      "cache-control": "public, max-age=86400",
    });
    res.end(asset.body);
    return;
  }

  const body = renderDashboardRouteBody(pathName, apiBase);
  if (body !== null) {
    const html = renderDashboardPage({
      title: pageTitle(),
      nav: DASHBOARD_NAV,
      body,
      apiBase,
    });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
  res.end(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Not found — ACPP</title></head><body><p>Not found.</p><p><a href="/">Home</a></p></body></html>`,
  );
}).listen(port, () => {
  console.log(`acpp web listening on :${port} (API ${apiBase})`);
});
