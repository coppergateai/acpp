#!/usr/bin/env node
/**
 * Local allow/deny demo — starts an in-memory API with stub GitHub unless ACPP_API_URL is set.
 *
 * Usage:
 *   pnpm --filter @acpp/example-quickstart demo
 *   pnpm --filter @acpp/example-quickstart demo:explicit
 *   ACPP_API_URL=http://127.0.0.1:8787 pnpm --filter @acpp/example-quickstart demo
 */
import assert from "node:assert/strict";
import { createApiServer } from "@acpp/api";
import {
  runCompactAllowDenyDemo,
  runExplicitAllowDenyDemo,
} from "./allow-deny-demo.ts";
import { mockGithubFetch } from "./mock-github.ts";

const explicit = process.argv.includes("--explicit");

async function main(): Promise<void> {
  const external = process.env.ACPP_API_URL?.replace(/\/$/, "");
  if (external) {
    const result = explicit
      ? await runExplicitAllowDenyDemo(external)
      : await runCompactAllowDenyDemo(external);
    printSuccess(result);
    return;
  }

  const server = createApiServer({ githubHttp: { fetch: mockGithubFetch } });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const result = explicit
      ? await runExplicitAllowDenyDemo(baseUrl)
      : await runCompactAllowDenyDemo(baseUrl);
    printSuccess(result);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function printSuccess(result: {
  mode: string;
  workspaceId: string;
  allowed: boolean;
  denied: boolean;
}): void {
  console.log(
    JSON.stringify(
      {
        ok: true,
        demo: "allow-and-deny",
        ...result,
        message:
          "Policy allowed protected GitHub action, then denied after grant revoke.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  process.exit(1);
});
