#!/usr/bin/env node
/**
 * Bootstrap a durable workspace against a running ACPP API and print Cursor mcp.json env.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { bootstrapHostDemo } from "./bootstrap.js";

async function main(): Promise<void> {
  const apiUrl = (process.env.ACPP_API_URL ?? "http://127.0.0.1:8787").replace(
    /\/$/,
    "",
  );
  const result = await bootstrapHostDemo({ apiUrl });

  const envBlock = {
    ACPP_EMBEDDED: "0",
    ACPP_API_URL: result.apiUrl,
    ACPP_WORKSPACE_ID: result.workspaceId,
    ACPP_SUBJECT: result.subject,
    ACPP_MCP_CONNECTION_ID: result.mcpConnectionId,
  };

  const outDir = join(process.cwd(), ".acpp");
  mkdirSync(outDir, { recursive: true });
  const envPath = join(outDir, "mcp-host.env.json");
  writeFileSync(envPath, `${JSON.stringify(envBlock, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        envPath,
        env: envBlock,
        note: "Mock MCP stays up only while this process runs; prefer ACPP_EMBEDDED=1 for Cursor.",
        mockUrl: result.mock.url,
      },
      null,
      2,
    ),
  );

  // Keep mock alive until Ctrl+C when used against external API.
  process.on("SIGINT", () => {
    void result.mock.close().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  process.exit(1);
});
