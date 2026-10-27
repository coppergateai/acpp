#!/usr/bin/env node
/**
 * Assert OPEN_PROGRAM.md has parseable Open IDs for Coppergate Spend License.
 * ID format mirrors coppergate: (P|W|A|S|AG|RT|SEC)-\d{2,4}
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "docs/OPEN_PROGRAM.md"), "utf8");
const re =
  /^\|\s*(Open|Done)\s*\|\s*((?:P|W|A|S|AG|RT|SEC)-\d{2,4})\s*\|\s*([^|]+)\|/gm;

const rows = [];
let m;
while ((m = re.exec(md))) {
  rows.push({
    status: m[1],
    id: m[2],
    title: m[3].trim(),
  });
}

const open = rows.filter((r) => r.status === "Open");
const done = rows.filter((r) => r.status === "Done");

if (rows.length === 0) {
  console.error("No Open Program rows parsed");
  process.exit(1);
}

if (open.length === 0) {
  console.error("No Open IDs — Arena has nothing to spend on");
  process.exit(2);
}

const next = open[0];
console.log(
  JSON.stringify(
    {
      ok: true,
      total: rows.length,
      openCount: open.length,
      doneCount: done.length,
      next: { id: next.id, title: next.title },
      openIds: open.map((r) => r.id),
    },
    null,
    2,
  ),
);
