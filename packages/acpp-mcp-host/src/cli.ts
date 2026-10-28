#!/usr/bin/env node
/**
 * ACPP MCP host adapter (A-030) — stdio MCP server for Cursor / Claude Desktop.
 *
 * Embedded (default for local Cursor install):
 *   ACPP_EMBEDDED=1 node dist/cli.js
 *
 * Attach to a running API:
 *   ACPP_API_URL=http://127.0.0.1:8787 \
 *   ACPP_WORKSPACE_ID=ws_… ACPP_SUBJECT=acpp:agent:… \
 *   ACPP_MCP_CONNECTION_ID=conn_… \
 *   ACPP_EMBEDDED=0 node dist/cli.js
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadHostConfig } from "./config.js";
import { startEmbeddedHost } from "./embedded.js";
import { createAcppHostServer } from "./server.js";

async function main(): Promise<void> {
  const preliminary = loadHostConfig();
  let closeEmbedded: (() => Promise<void>) | undefined;
  let config = preliminary;

  if (preliminary.embedded) {
    const embedded = await startEmbeddedHost();
    config = embedded.config;
    closeEmbedded = embedded.close;
    // Log to stderr only — stdout is reserved for MCP JSON-RPC.
    console.error(
      JSON.stringify({
        acpp_mcp_host: "embedded",
        workspaceId: config.workspaceId,
        subject: config.subject,
        mcpConnectionId: config.mcpConnectionId,
        apiUrl: config.apiUrl,
      }),
    );
  }

  const runtime = await createAcppHostServer(config);
  const transport = new StdioServerTransport();
  await runtime.server.connect(transport);

  const shutdown = async () => {
    await runtime.server.close().catch(() => undefined);
    if (closeEmbedded) {
      await closeEmbedded().catch(() => undefined);
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
