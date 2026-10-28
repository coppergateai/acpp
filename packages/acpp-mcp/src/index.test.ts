import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MCP_GATEWAY_PIPELINE,
  assertSafeMcpServerEndpoint,
  evaluateMcpGatewayPrecheck,
  filterPermittedMcpTools,
  isToolOnConnectionAllowlist,
  mcpResource,
  sanitizeMcpToolResult,
} from "./index.ts";

describe("@acpp/mcp gateway sketch", () => {
  it("defines the PRODUCT §10.5 pipeline in order", () => {
    assert.equal(MCP_GATEWAY_PIPELINE.length, 8);
    assert.equal(MCP_GATEWAY_PIPELINE[0], "authenticate_actor");
    assert.equal(MCP_GATEWAY_PIPELINE.at(-1), "return_sanitized_result");
  });

  it("blocks at the first failed precheck step", () => {
    const allPass = evaluateMcpGatewayPrecheck({
      authenticated: true,
      connectionFound: true,
      authorized: true,
      toolAllowed: true,
      argumentsValid: true,
      withinRateLimit: true,
      approvalSatisfied: true,
    });
    assert.equal(allPass.proceedToExecution, true);
    assert.equal(allPass.blockedAt, null);

    const denied = evaluateMcpGatewayPrecheck({
      authenticated: true,
      connectionFound: true,
      authorized: false,
      toolAllowed: true,
      argumentsValid: true,
      withinRateLimit: true,
      approvalSatisfied: true,
    });
    assert.equal(denied.proceedToExecution, false);
    assert.equal(denied.blockedAt, "check_authorization");
    assert.equal(denied.reason, "policy_denied");
  });

  it("maps tools to stable MCP resource ids", () => {
    assert.equal(
      mcpResource("conn_abc", "search_docs"),
      "mcp:connection:conn_abc:tool:search_docs",
    );
  });
});

describe("@acpp/mcp security boundary", () => {
  it("requires HTTPS for remote MCP servers", () => {
    assert.deepEqual(assertSafeMcpServerEndpoint("http://tools.example.com/mcp"), {
      ok: false,
      reason: "https_required_for_remote",
    });
    assert.deepEqual(assertSafeMcpServerEndpoint("https://tools.example.com/mcp"), {
      ok: true,
    });
  });

  it("blocks private addresses and cloud metadata endpoints", () => {
    assert.equal(assertSafeMcpServerEndpoint("https://10.0.0.5/mcp").ok, false);
    assert.equal(
      assertSafeMcpServerEndpoint("https://169.254.169.254/latest/meta-data/").ok,
      false,
    );
  });

  it("allows localhost only when explicitly opted in", () => {
    assert.equal(assertSafeMcpServerEndpoint("http://127.0.0.1:3001/mcp").ok, false);
    assert.deepEqual(
      assertSafeMcpServerEndpoint("http://127.0.0.1:3001/mcp", { allowLocalhost: true }),
      { ok: true },
    );
  });

  it("filters discovery to permitted tools only", () => {
    const catalog = [
      { name: "read_file", description: "read" },
      { name: "run_shell", description: "danger" },
      { name: "search", description: "search" },
    ];
    const visible = filterPermittedMcpTools(catalog, ["read_file", "search"]);
    assert.deepEqual(
      visible.map((t) => t.name),
      ["read_file", "search"],
    );
  });

  it("enforces connection tool allowlists", () => {
    assert.equal(isToolOnConnectionAllowlist(["a", "b"], "a"), true);
    assert.equal(isToolOnConnectionAllowlist(["a", "b"], "c"), false);
  });

  it("redacts credential-like fields from tool results", () => {
    const clean = sanitizeMcpToolResult({
      content: "ok",
      accessToken: "secret",
      nested: { password: "nope" },
    });
    assert.equal(clean.content, "ok");
    assert.equal("accessToken" in clean, false);
  });
});
