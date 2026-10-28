import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { createActorAddress } from "@acpp/core";
import { generateEd25519KeyPair } from "@acpp/identity";
import type { AuthorizationDecision } from "@acpp/policy";
import {
  AcppHostedClient,
  ProtectedOperationError,
  buildExecutionAuthorizationProof,
  signSignalEnvelope,
  verifySignalEnvelopeSignature,
} from "./index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function allowDecision(overrides: Partial<AuthorizationDecision> = {}): AuthorizationDecision {
  return {
    decisionId: "allow_g_test",
    allow: true,
    reason: "grant_match",
    grantId: "g_test",
    requiresApproval: false,
    evaluatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("@acpp/sdk authz", () => {
  it("builds grant-only proof when approval is not required", () => {
    const decision = allowDecision();
    const proof = buildExecutionAuthorizationProof(decision);
    assert.equal(proof.kind, "grant_allow");
  });

  it("requires explicit approvalId when grant requires approval", () => {
    const decision = allowDecision({ requiresApproval: true });
    assert.throws(
      () => buildExecutionAuthorizationProof(decision),
      (err: unknown) => {
        assert.ok(err instanceof ProtectedOperationError);
        assert.equal(err.code, "approval_required");
        return true;
      },
    );
  });

  it("accepts approval-bound proof when approvalId is supplied", () => {
    const decision = allowDecision({ requiresApproval: true });
    const proof = buildExecutionAuthorizationProof(decision, "appr_1");
    assert.equal(proof.kind, "approval_bound");
    if (proof.kind === "approval_bound") {
      assert.equal(proof.approvalId, "appr_1");
    }
  });

  it("rejects deny decisions", () => {
    const decision = allowDecision({ allow: false, reason: "no_matching_grant" });
    assert.throws(
      () => buildExecutionAuthorizationProof(decision),
      (err: unknown) => {
        assert.ok(err instanceof ProtectedOperationError);
        assert.equal(err.code, "authorization_denied");
        return true;
      },
    );
  });
});

describe("@acpp/sdk signals", () => {
  it("signs and verifies envelopes locally", () => {
    const keys = generateEd25519KeyPair();
    const sender = createActorAddress("agent", "SDKTEST01");
    const envelope = signSignalEnvelope(
      {
        signalId: "sig_sdk_local_1",
        type: "request",
        audience: createActorAddress("human", "owner"),
        contentType: "application/json",
        payload: { probe: true },
      },
      { sender, publicKey: keys.publicKey, privateKey: keys.privateKey },
    );
    assert.equal(
      verifySignalEnvelopeSignature(envelope, keys.publicKey),
      true,
    );
    assert.equal(
      verifySignalEnvelopeSignature(envelope, generateEd25519KeyPair().publicKey),
      false,
    );
  });
});

describe("@acpp/sdk hosted client", () => {
  it("executeGithubProtectedAction requires explicit proof (no evaluate inside client)", async () => {
    const calls: string[] = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      return new Response(JSON.stringify({ execution: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new AcppHostedClient({
      baseUrl: "http://127.0.0.1:9",
      fetch: mockFetch,
    });
    const decision = allowDecision();
    const proof = buildExecutionAuthorizationProof(decision);
    const subject = createActorAddress("agent", "SDKEXEC1");
    const result = await client.executeGithubProtectedAction({
      workspaceId: "ws_demo",
      connectionId: "conn_1",
      subject,
      repo: "org/repo",
      action: "issues.comment",
      payload: { issueNumber: 1, body: "hi" },
      proof,
      decision,
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.match(calls[0]!, /\/v1\/github\/actions\/execute$/);
    assert.doesNotMatch(calls.join("\n"), /authorization\/evaluate/);
    assert.doesNotMatch(calls.join("\n"), /\/v1\/approvals/);
  });

  it("rejects mismatched proof and decision", async () => {
    const client = new AcppHostedClient({
      baseUrl: "http://127.0.0.1:9",
      fetch: async () =>
        new Response("{}", { status: 500, headers: { "content-type": "application/json" } }),
    });
    const proof = buildExecutionAuthorizationProof(allowDecision({ decisionId: "a" }));
    const decision = allowDecision({ decisionId: "b" });
    await assert.rejects(
      () =>
        client.executeGithubProtectedAction({
          workspaceId: "ws_demo",
          connectionId: "conn_1",
          subject: createActorAddress("agent", "SDKEXEC2"),
          repo: "org/repo",
          action: "issues.comment",
          payload: {},
          proof,
          decision,
        }),
      (err: unknown) => {
        assert.ok(err instanceof ProtectedOperationError);
        assert.equal(err.code, "proof_decision_mismatch");
        return true;
      },
    );
  });
});

describe("@acpp/sdk PRODUCT §17.2 guardrails", () => {
  it("does not ship auto-approve convenience helpers in source", () => {
    const srcDir = join(__dirname);
    const files = ["authz.ts", "client.ts", "signals.ts", "index.ts"];
    const forbidden = [
      /autoApprove/i,
      /auto_approve/i,
      /executeAndApprove/i,
      /approveAndExecute/i,
      /runProtected/i,
    ];
    for (const file of files) {
      const text = readFileSync(join(srcDir, file), "utf8");
      for (const pattern of forbidden) {
        assert.doesNotMatch(
          text,
          pattern,
          `${file} must not contain convenience auto-approve patterns`,
        );
      }
    }
  });
});
