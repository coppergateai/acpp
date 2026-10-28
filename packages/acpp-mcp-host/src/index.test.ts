import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApiServer } from "@acpp/api";
import { mcpResource } from "@acpp/mcp";
import { bootstrapHostDemo } from "./bootstrap.js";
import { AcppGatewayClient } from "./gateway-client.js";
import {
  discoverHostTools,
  handleHostToolCall,
  sanitizeMcpToolName,
} from "./tools.js";
import type { AcppHostConfig } from "./config.js";

describe("@acpp/mcp-host A-030", () => {
  it("sanitizeMcpToolName keeps MCP-safe names", () => {
    assert.equal(sanitizeMcpToolName("echo"), "mcp_echo");
    assert.equal(sanitizeMcpToolName("foo/bar"), "mcp_foo_bar");
  });

  it("embedded-style bootstrap: list capabilities + allow echo + deny unknown", async () => {
    const apiServer = createApiServer();
    await new Promise<void>((resolve) => {
      apiServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = apiServer.address();
    assert.ok(addr && typeof addr === "object");
    const apiUrl = `http://127.0.0.1:${addr.port}`;

    const boot = await bootstrapHostDemo({ apiUrl, workspaceSuffix: "host-test" });
    try {
      const config: AcppHostConfig = {
        apiUrl,
        workspaceId: boot.workspaceId,
        subject: boot.subject,
        mcpConnectionId: boot.mcpConnectionId,
        embedded: true,
      };
      const client = new AcppGatewayClient({ baseUrl: apiUrl });
      const descriptors = await discoverHostTools(client, config);
      assert.ok(descriptors.some((d) => d.name === "acpp_whoami"));
      assert.ok(
        descriptors.some(
          (d) => d.kind === "mcp" && d.mcpToolName === boot.mockTool,
        ),
      );

      const whoami = await handleHostToolCall({
        name: "acpp_whoami",
        args: {},
        client,
        config,
        descriptors,
      });
      assert.equal(whoami.isError, false);

      const caps = await handleHostToolCall({
        name: "acpp_list_capabilities",
        args: {},
        client,
        config,
        descriptors,
      });
      assert.equal(caps.isError, false);

      const evalOk = await handleHostToolCall({
        name: "acpp_evaluate_authorization",
        args: {
          resource: mcpResource(boot.mcpConnectionId, boot.mockTool),
          action: "mcp.tools.call",
        },
        client,
        config,
        descriptors,
      });
      assert.equal(evalOk.isError, false);
      assert.match(JSON.stringify(evalOk.structuredContent), /"allow":\s*true/);

      const echo = await handleHostToolCall({
        name: sanitizeMcpToolName(boot.mockTool),
        args: { message: "cursor" },
        client,
        config,
        descriptors,
      });
      assert.equal(echo.isError, false);
      assert.match(JSON.stringify(echo.structuredContent), /echo:cursor|cursor/);

      const denied = await handleHostToolCall({
        name: "acpp_mcp_invoke",
        args: { toolName: "not-granted-tool", arguments: {} },
        client,
        config,
        descriptors,
      });
      assert.equal(denied.isError, true);
    } finally {
      await boot.mock.close();
      await new Promise<void>((resolve, reject) => {
        apiServer.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
