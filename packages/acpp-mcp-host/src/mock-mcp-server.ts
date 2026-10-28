/**
 * Minimal JSON-RPC MCP HTTP stub for local host-adapter dogfood.
 * Not a marketplace connector — only used when ACPP_EMBEDDED=1.
 */
import { createServer, type Server } from "node:http";

export type MockMcpHandle = {
  url: string;
  close: () => Promise<void>;
};

export async function startMockMcpServer(
  tools: readonly string[] = ["echo"],
): Promise<MockMcpHandle> {
  const server: Server = createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let body: {
      id?: string | number;
      method?: string;
      params?: { name?: string; arguments?: Record<string, unknown> };
    };
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as typeof body;
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { message: "bad_json" } }));
      return;
    }

    const id = body.id ?? 1;
    if (body.method === "tools/list") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            tools: tools.map((name) => ({
              name,
              description: `Mock MCP tool ${name}`,
              inputSchema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            })),
          },
        }),
      );
      return;
    }

    if (body.method === "tools/call") {
      const name = body.params?.name ?? "";
      if (!tools.includes(name)) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: { message: `unknown_tool:${name}` },
          }),
        );
        return;
      }
      const message =
        typeof body.params?.arguments?.message === "string"
          ? body.params.arguments.message
          : "ok";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `echo:${message}` }],
            structuredContent: { echo: message, tool: name },
          },
        }),
      );
      return;
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { message: `unsupported_method:${body.method ?? ""}` },
      }),
    );
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("mock_mcp_bind_failed");
  }
  return {
    url: `http://127.0.0.1:${addr.port}/mcp`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
