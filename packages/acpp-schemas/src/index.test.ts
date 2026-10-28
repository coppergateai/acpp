import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACPP_PROTOCOL_VERSION } from "@acpp/core";
import {
  ACPP_HOSTED_API_VERSION,
  ACPP_PROTOCOL_SCHEMA_VERSION,
  DOCUMENTED_HOSTED_PATHS,
  SKETCHED_MCP_HOSTED_PATHS,
  loadHostedOpenApi,
  loadProtocolManifest,
  loadProtocolSchema,
} from "./index.ts";

describe("@acpp/schemas", () => {
  it("exposes versioned hosted API and protocol schema bundles", () => {
    assert.equal(ACPP_HOSTED_API_VERSION, "1.0.0");
    assert.equal(ACPP_PROTOCOL_SCHEMA_VERSION, ACPP_PROTOCOL_VERSION);
  });

  it("loads OpenAPI with paths aligned to DOCUMENTED_HOSTED_PATHS", () => {
    const doc = loadHostedOpenApi();
    assert.equal(doc.openapi, "3.1.0");
    assert.equal(doc.info.version, ACPP_HOSTED_API_VERSION);
    for (const path of DOCUMENTED_HOSTED_PATHS) {
      assert.ok(
        path in doc.paths,
        `missing OpenAPI path ${path}`,
      );
    }
  });

  it("documents MCP gateway sketch paths separately from implemented routes", () => {
    const doc = loadHostedOpenApi();
    for (const path of SKETCHED_MCP_HOSTED_PATHS) {
      assert.ok(path in doc.paths, `missing MCP sketch path ${path}`);
      assert.equal(
        path in DOCUMENTED_HOSTED_PATHS,
        false,
        `${path} must stay sketch-only until P-050`,
      );
      const pathItem = doc.paths[path] as Record<string, Record<string, unknown>>;
      for (const method of Object.values(pathItem)) {
        assert.equal(method["x-acpp-implementation-status"], "sketch");
      }
    }
  });

  it("loads portable protocol manifest and schemas", () => {
    const manifest = loadProtocolManifest();
    assert.equal(manifest.protocolVersion, ACPP_PROTOCOL_SCHEMA_VERSION);
    assert.ok(manifest.schemas.length >= 4);

    for (const entry of manifest.schemas) {
      const schema = loadProtocolSchema(entry.id);
      assert.ok(schema, entry.id);
      assert.equal(typeof schema!.$schema, "string");
      assert.equal(typeof schema!.title, "string");
    }

    assert.equal(loadProtocolSchema("not-a-schema"), null);
  });

  it("signal-envelope schema requires auth-capable fields", () => {
    const schema = loadProtocolSchema("signal-envelope");
    assert.ok(schema);
    const required = schema!.required as string[];
    assert.ok(required.includes("signalId"));
    assert.ok(required.includes("sender"));
    const props = schema!.properties as Record<string, unknown>;
    assert.ok(props.auth);
  });
});
