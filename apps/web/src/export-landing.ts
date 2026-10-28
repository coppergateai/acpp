import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderLandingPage } from "./landing/page.js";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

await mkdir(publicDir, { recursive: true });
const html = renderLandingPage();
await writeFile(path.join(publicDir, "index.html"), html, "utf8");
console.log(`Wrote ${path.join(publicDir, "index.html")} (${html.length} bytes)`);
