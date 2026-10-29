#!/usr/bin/env node
/**
 * Wedge GitHub demo — live HTTP against `@acpp/api` (A-010).
 *
 * Usage:
 *   pnpm --filter @acpp/example-wedge-github demo
 *   ACPP_API_URL=http://127.0.0.1:8787 pnpm --filter @acpp/example-wedge-github demo
 *
 * In-process sketch (no HTTP): see `demo.ts` / unit tests.
 */
import assert from "node:assert/strict";
import { createApiServer } from "@acpp/api";
import { runWedgeHttpDemo } from "./http-demo.ts";

async function mockGithubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url.includes("/issues/") && init?.method === "POST") {
    return new Response(JSON.stringify({ id: 1, html_url: "https://example.test/1" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ full_name: "coppergateai/acpp" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function main(): Promise<void> {
  const external = process.env.ACPP_API_URL?.replace(/\/$/, "");
  if (external) {
    const result = await runWedgeHttpDemo(external);
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
    const result = await runWedgeHttpDemo(baseUrl);
    printSuccess(result);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function printSuccess(result: {
  workspaceId: string;
  allowed: boolean;
  denied: boolean;
  allowReceiptId: string;
  denyReceiptId: string;
}): void {
  console.log(
    JSON.stringify(
      {
        ok: true,
        demo: "wedge-github",
        ...result,
        message:
          "WEDGE: register → grant → GitHub action → receipt → revoke → deny (via @acpp/api).",
        next: "Open /receipts on @acpp/web or see docs/wedge-github.md",
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
