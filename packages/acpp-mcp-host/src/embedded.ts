import type { Server } from "node:http";
import { createApiServer } from "@acpp/api";
import type { AcppHostConfig } from "./config.js";
import { bootstrapHostDemo, type BootstrapResult } from "./bootstrap.js";

export type EmbeddedRuntime = {
  config: AcppHostConfig;
  bootstrap: BootstrapResult;
  apiServer: Server;
  close: () => Promise<void>;
};

/**
 * Start in-process ACPP API + mock MCP + seeded grant for Cursor/Claude install.
 */
export async function startEmbeddedHost(): Promise<EmbeddedRuntime> {
  const apiServer = createApiServer();
  await new Promise<void>((resolve) => {
    apiServer.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = apiServer.address();
  if (!addr || typeof addr === "string") {
    throw new Error("embedded_api_bind_failed");
  }
  const apiUrl = `http://127.0.0.1:${addr.port}`;

  const bootstrap = await bootstrapHostDemo({ apiUrl });
  const config: AcppHostConfig = {
    apiUrl,
    workspaceId: bootstrap.workspaceId,
    subject: bootstrap.subject,
    mcpConnectionId: bootstrap.mcpConnectionId,
    embedded: true,
  };

  return {
    config,
    bootstrap,
    apiServer,
    close: async () => {
      await bootstrap.mock.close();
      await new Promise<void>((resolve, reject) => {
        apiServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
