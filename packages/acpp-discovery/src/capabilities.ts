import type { ActorAddress } from "@acpp/core";
import { filterPermittedMcpTools, mcpResource } from "@acpp/mcp";
import {
  evaluateGrant,
  type PermissionGrant,
} from "@acpp/policy";

/** PRODUCT §5.2 — echoed on every discovery response. */
export const DISCOVERY_IS_NOT_CONSENT = true as const;

export const CAPABILITIES_READ_ACTION = "capabilities:read" as const;

export type PermittedCapability = {
  grantId: string;
  resource: string;
  action: string;
  requiresApproval: boolean;
  expiresAt?: string;
  provider: "github" | "mcp" | "other";
};

export type ResolvedIdentitySummary = {
  address: ActorAddress;
  actorType: string;
  displayName: string;
  status: string;
};

export type IdentityDiscoveryResult = {
  identity: ResolvedIdentitySummary;
  /** Actor whose policy-permitted capabilities are listed (usually the resolved identity). */
  subject: ActorAddress;
  requester: ActorAddress;
  capabilities: PermittedCapability[];
  discoveryIsNotConsent: typeof DISCOVERY_IS_NOT_CONSENT;
  notice: string;
};

export type McpToolDiscoveryResult = {
  workspaceId: string;
  subject: ActorAddress;
  connectionId: string;
  tools: Array<{ name: string }>;
  discoveryIsNotConsent: typeof DISCOVERY_IS_NOT_CONSENT;
  notice: string;
};

export function identityCapabilitiesResource(target: ActorAddress): string {
  return `acpp:identity:${target}`;
}

export function isActiveGrant(grant: PermissionGrant, at: string): boolean {
  if (grant.revokedAt) {
    return false;
  }
  if (grant.expiresAt && grant.expiresAt <= at) {
    return false;
  }
  return true;
}

function providerForResource(resource: string): PermittedCapability["provider"] {
  if (resource.startsWith("github:")) {
    return "github";
  }
  if (resource.startsWith("mcp:connection:")) {
    return "mcp";
  }
  return "other";
}

export function grantToPermittedCapability(grant: PermissionGrant): PermittedCapability {
  return {
    grantId: grant.grantId,
    resource: grant.resource,
    action: grant.action,
    requiresApproval: grant.requiresApproval,
    expiresAt: grant.expiresAt,
    provider: providerForResource(grant.resource),
  };
}

/**
 * Policy-permitted capabilities for a subject — grants only, never full connector catalogs (PRODUCT §10.4).
 */
export function listPermittedCapabilitiesForSubject(
  grants: readonly PermissionGrant[],
  subject: ActorAddress,
  at?: string,
): PermittedCapability[] {
  const now = at ?? new Date().toISOString();
  return grants
    .filter((g) => g.subject === subject && isActiveGrant(g, now))
    .map(grantToPermittedCapability);
}

export type AuthorizeDiscoveryInput = {
  requester: ActorAddress;
  target: ActorAddress;
  grants: readonly PermissionGrant[];
  at?: string;
};

/** Self-discovery is allowed; cross-actor discovery requires an explicit capabilities:read grant. */
export function authorizeCapabilityDiscovery(
  input: AuthorizeDiscoveryInput,
): { allowed: true } | { allowed: false; reason: string } {
  if (input.requester === input.target) {
    return { allowed: true };
  }
  const decision = evaluateGrant([...input.grants], {
    subject: input.requester,
    resource: identityCapabilitiesResource(input.target),
    action: CAPABILITIES_READ_ACTION,
    at: input.at,
  });
  if (!decision.allow) {
    return { allowed: false, reason: decision.reason };
  }
  return { allowed: true };
}

export type DiscoverIdentityCapabilitiesInput = {
  identity: ResolvedIdentitySummary;
  subject: ActorAddress;
  requester: ActorAddress;
  grants: readonly PermissionGrant[];
  at?: string;
};

export function discoverIdentityCapabilities(
  input: DiscoverIdentityCapabilitiesInput,
):
  | { ok: true; discovery: IdentityDiscoveryResult }
  | { ok: false; reason: string } {
  const auth = authorizeCapabilityDiscovery({
    requester: input.requester,
    target: input.identity.address,
    grants: input.grants,
    at: input.at,
  });
  if (!auth.allowed) {
    return { ok: false, reason: auth.reason };
  }
  const capabilities = listPermittedCapabilitiesForSubject(
    input.grants,
    input.subject,
    input.at,
  );
  return {
    ok: true,
    discovery: {
      identity: input.identity,
      subject: input.subject,
      requester: input.requester,
      capabilities,
      discoveryIsNotConsent: DISCOVERY_IS_NOT_CONSENT,
      notice:
        "Discovery lists policy-permitted capabilities only. It does not grant consent to invoke actions.",
    },
  };
}

export function parseMcpToolFromGrantResource(
  resource: string,
  connectionId: string,
): string | null {
  const prefix = `mcp:connection:${connectionId}:tool:`;
  if (!resource.startsWith(prefix)) {
    return null;
  }
  const toolName = resource.slice(prefix.length);
  return toolName.length > 0 ? toolName : null;
}

export type DiscoverMcpToolsInput = {
  workspaceId: string;
  subject: ActorAddress;
  connectionId: string;
  grants: readonly PermissionGrant[];
  /** Connection-level allowlist — tools outside this set are never returned even with a grant. */
  connectionAllowedTools?: readonly string[];
  /** Optional metadata catalog; only granted tool names are included after filtering. */
  toolCatalog?: ReadonlyArray<{ name: string; description?: string }>;
  at?: string;
};

/**
 * MCP tool discovery for an authorized actor (PRODUCT §10.4).
 * Never returns tools that lack an active grant for the subject.
 */
export function discoverMcpToolCapabilities(
  input: DiscoverMcpToolsInput,
): McpToolDiscoveryResult {
  const now = input.at ?? new Date().toISOString();
  const grantedNames = new Set<string>();
  for (const grant of input.grants) {
    if (grant.subject !== input.subject || !isActiveGrant(grant, now)) {
      continue;
    }
    const tool = parseMcpToolFromGrantResource(grant.resource, input.connectionId);
    if (!tool) {
      continue;
    }
    if (grant.action !== "invoke" && grant.action !== "tools.call") {
      continue;
    }
    if (
      input.connectionAllowedTools &&
      !input.connectionAllowedTools.includes(tool)
    ) {
      continue;
    }
    grantedNames.add(tool);
  }

  const permittedNames = [...grantedNames].sort();
  let tools: Array<{ name: string; description?: string }>;
  if (input.toolCatalog && input.toolCatalog.length > 0) {
    tools = filterPermittedMcpTools(input.toolCatalog, permittedNames);
  } else {
    tools = permittedNames.map((name) => ({ name }));
  }

  return {
    workspaceId: input.workspaceId,
    subject: input.subject,
    connectionId: input.connectionId,
    tools,
    discoveryIsNotConsent: DISCOVERY_IS_NOT_CONSENT,
    notice:
      "Listed MCP tools are policy-permitted for this subject. Discovery does not authorize invocation.",
  };
}

/** Stable grant resource id for MCP tool invoke (re-export for API callers). */
export { mcpResource };
