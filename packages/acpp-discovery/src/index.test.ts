import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createActorAddress } from "@acpp/core";
import type { PermissionGrant } from "@acpp/policy";
import {
  CAPABILITIES_READ_ACTION,
  DISCOVERY_IS_NOT_CONSENT,
  authorizeCapabilityDiscovery,
  discoverIdentityCapabilities,
  discoverMcpToolCapabilities,
  identityCapabilitiesResource,
  listPermittedCapabilitiesForSubject,
  mcpResource,
} from "./index.ts";

describe("@acpp/discovery identity capabilities", () => {
  const agentA = createActorAddress("agent", "01JDISCA");
  const agentB = createActorAddress("agent", "01JDISCB");
  const human = createActorAddress("human", "01JDISCH");

  const githubGrant: PermissionGrant = {
    grantId: "gr_github",
    subject: agentA,
    resource: "github:repo:org/app",
    action: "issues.comment",
    requiresApproval: false,
  };

  it("lists only active grants for the subject", () => {
    const caps = listPermittedCapabilitiesForSubject(
      [
        githubGrant,
        {
          grantId: "gr_revoked",
          subject: agentA,
          resource: "github:repo:other/app",
          action: "repos.metadata.read",
          requiresApproval: false,
          revokedAt: new Date().toISOString(),
        },
        {
          grantId: "gr_other",
          subject: agentB,
          resource: "github:repo:org/app",
          action: "issues.comment",
          requiresApproval: false,
        },
      ],
      agentA,
    );
    assert.equal(caps.length, 1);
    assert.equal(caps[0]!.grantId, "gr_github");
    assert.equal(caps[0]!.provider, "github");
  });

  it("allows self-discovery without a capabilities:read grant", () => {
    const auth = authorizeCapabilityDiscovery({
      requester: agentA,
      target: agentA,
      grants: [],
    });
    assert.equal(auth.allowed, true);
  });

  it("denies cross-actor discovery without capabilities:read", () => {
    const auth = authorizeCapabilityDiscovery({
      requester: human,
      target: agentA,
      grants: [githubGrant],
    });
    assert.equal(auth.allowed, false);
    if (!auth.allowed) {
      assert.equal(auth.reason, "no_matching_grant");
    }
  });

  it("allows cross-actor discovery with capabilities:read grant", () => {
    const readGrant: PermissionGrant = {
      grantId: "gr_read",
      subject: human,
      resource: identityCapabilitiesResource(agentA),
      action: CAPABILITIES_READ_ACTION,
      requiresApproval: false,
    };
    const auth = authorizeCapabilityDiscovery({
      requester: human,
      target: agentA,
      grants: [readGrant],
    });
    assert.equal(auth.allowed, true);
  });

  it("returns resolved identity and permitted capabilities with discovery ≠ consent", () => {
    const identity = {
      address: agentA,
      actorType: "agent",
      displayName: "Agent A",
      status: "active",
    };
    const result = discoverIdentityCapabilities({
      identity,
      subject: agentA,
      requester: agentA,
      grants: [githubGrant],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.discovery.discoveryIsNotConsent, DISCOVERY_IS_NOT_CONSENT);
      assert.equal(result.discovery.capabilities.length, 1);
      assert.equal(result.discovery.identity.address, agentA);
    }
  });
});

describe("@acpp/discovery MCP tools", () => {
  const agent = createActorAddress("agent", "01JMCP");
  const connectionId = "conn_mcp1";

  it("returns only granted tools for the connection", () => {
    const grants: PermissionGrant[] = [
      {
        grantId: "gr_tool_a",
        subject: agent,
        resource: mcpResource(connectionId, "search_docs"),
        action: "invoke",
        requiresApproval: false,
      },
      {
        grantId: "gr_tool_b",
        subject: agent,
        resource: mcpResource(connectionId, "run_shell"),
        action: "invoke",
        requiresApproval: false,
      },
      {
        grantId: "gr_other_conn",
        subject: agent,
        resource: mcpResource("conn_other", "search_docs"),
        action: "invoke",
        requiresApproval: false,
      },
    ];
    const catalog = [
      { name: "search_docs", description: "Search" },
      { name: "run_shell", description: "Danger" },
      { name: "hidden_tool", description: "Not granted" },
    ];
    const discovery = discoverMcpToolCapabilities({
      workspaceId: "ws_test",
      subject: agent,
      connectionId,
      grants,
      connectionAllowedTools: ["search_docs", "run_shell", "hidden_tool"],
      toolCatalog: catalog,
    });
    assert.deepEqual(
      discovery.tools.map((t) => t.name),
      ["search_docs", "run_shell"],
    );
    assert.equal(discovery.discoveryIsNotConsent, true);
    assert.ok(discovery.notice.includes("does not authorize"));
  });

  it("respects connection allowlist over grants", () => {
    const grants: PermissionGrant[] = [
      {
        grantId: "gr_tool",
        subject: agent,
        resource: mcpResource(connectionId, "run_shell"),
        action: "invoke",
        requiresApproval: false,
      },
    ];
    const discovery = discoverMcpToolCapabilities({
      workspaceId: "ws_test",
      subject: agent,
      connectionId,
      grants,
      connectionAllowedTools: ["search_docs"],
    });
    assert.equal(discovery.tools.length, 0);
  });
});
