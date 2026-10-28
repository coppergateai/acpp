import assert from "node:assert/strict";
import type { Server } from "node:http";
import { createApiServer } from "@acpp/api";
import { mockGithubFetch } from "./mock-github.ts";

export async function withMockApiServer(
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server: Server = createApiServer({
    githubHttp: { fetch: mockGithubFetch },
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  assert.ok(addr && typeof addr === "object");
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
