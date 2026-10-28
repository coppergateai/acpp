/**
 * Thin HTTP client for the hosted ACPP gateway (PRODUCT §10.5 / §10.7).
 */

export type GatewayClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export type PermittedCapability = {
  grantId: string;
  resource: string;
  action: string;
  requiresApproval: boolean;
  expiresAt?: string;
  provider: "github" | "mcp" | "other";
};

export type McpCapabilitiesResponse = {
  workspaceId: string;
  subject: string;
  connectionId: string;
  tools: Array<{ name: string }>;
  discoveryIsNotConsent: boolean;
  notice?: string;
};

export type IdentityCapabilitiesResponse = {
  identity: { address: string };
  subject: string;
  capabilities: PermittedCapability[];
  discoveryIsNotConsent: boolean;
  notice?: string;
};

type JsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: unknown };

export class AcppGatewayClient {
  readonly base: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: GatewayClientOptions) {
    this.base = options.baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetchImpl ?? fetch;
  }

  private async readJson<T>(res: Response): Promise<T> {
    return res.json() as Promise<T>;
  }

  private async postJson<T>(path: string, body: unknown): Promise<JsonResult<T>> {
    const res = await this.fetchFn(`${this.base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await this.readJson<T>(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, data };
  }

  private async getJson<T>(path: string): Promise<JsonResult<T>> {
    const res = await this.fetchFn(`${this.base}${path}`);
    const data = await this.readJson<T>(res);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, status: res.status, data };
  }

  async listIdentityCapabilities(
    address: string,
    input: { workspaceId: string; requester: string },
  ): Promise<JsonResult<IdentityCapabilitiesResponse>> {
    const q = new URLSearchParams({
      workspaceId: input.workspaceId,
      requester: input.requester,
    });
    // Actor addresses contain ":" — leave unencoded so API path regex matches.
    return this.getJson(`/v1/identities/${address}/capabilities?${q}`);
  }

  async listMcpCapabilities(input: {
    workspaceId: string;
    subject: string;
    connectionId: string;
    allowedTools?: string[];
  }): Promise<JsonResult<McpCapabilitiesResponse>> {
    const q = new URLSearchParams({
      workspaceId: input.workspaceId,
      subject: input.subject,
      connectionId: input.connectionId,
    });
    if (input.allowedTools?.length) {
      q.set("allowedTools", input.allowedTools.join(","));
    }
    return this.getJson(`/v1/mcp/capabilities?${q}`);
  }

  async evaluateAuthorization(input: {
    workspaceId: string;
    subject: string;
    resource: string;
    action: string;
    at?: string;
  }): Promise<JsonResult<{ decision: { allow: boolean; reason: string } }>> {
    return this.postJson("/v1/authorization/evaluate", input);
  }

  async invokeMcpTool(input: {
    workspaceId: string;
    connectionId: string;
    subject: string;
    toolName: string;
    arguments?: Record<string, unknown>;
    approvalId?: string;
  }): Promise<JsonResult<Record<string, unknown>>> {
    return this.postJson("/v1/mcp/tools/invoke", input);
  }

  async executeGithubAction(input: {
    workspaceId: string;
    connectionId: string;
    subject: string;
    repo: string;
    action: "issues.comment" | "repos.metadata.read";
    payload?: Record<string, unknown>;
    approvalId?: string;
  }): Promise<JsonResult<Record<string, unknown>>> {
    return this.postJson("/v1/github/actions/execute", input);
  }

  async createWorkspace(input: {
    id: string;
    slug: string;
    displayName: string;
  }): Promise<JsonResult<{ workspace: { workspaceId: string } }>> {
    return this.postJson("/v1/workspaces", input);
  }

  async registerIdentity(
    workspaceId: string,
    input: {
      actorType: string;
      actorId: string;
      displayName: string;
      publicKey: string;
    },
  ): Promise<
    JsonResult<{ identity: { address: string }; key: { keyId: string } }>
  > {
    return this.postJson(`/v1/workspaces/${workspaceId}/identities`, input);
  }

  async connectMcp(
    workspaceId: string,
    input: {
      serverUrl: string;
      allowedTools: string[];
      accessToken?: string;
    },
  ): Promise<JsonResult<{ connection: { connectionId: string } }>> {
    return this.postJson(
      `/v1/workspaces/${workspaceId}/connections/mcp`,
      input,
    );
  }

  async createGrant(input: {
    workspaceId: string;
    grantedBy: string;
    subject: string;
    resource: string;
    action: string;
    requiresApproval?: boolean;
  }): Promise<JsonResult<{ grant: { grantId: string } }>> {
    return this.postJson("/v1/grants", input);
  }
}
