import { createServer } from "node:http";
import { ACPP_PROTOCOL_VERSION } from "@acpp/core";

/**
 * Minimal health API. Full Developer API lands with A-010.
 */
export function createApiServer() {
  return createServer((req, res) => {
    if (req.url === "/health" || req.url === "/ready") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          protocolVersion: ACPP_PROTOCOL_VERSION,
        }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}
