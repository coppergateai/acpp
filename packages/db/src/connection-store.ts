import { randomBytes } from "node:crypto";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";
import { WorkspaceStore } from "./workspace-store.js";

export type StoredGithubConnection = {
  connectionId: string;
  workspaceId: WorkspaceId;
  installationId: string;
  /** Opaque ref — raw token never appears on connection records exposed to agents. */
  credentialRef: string;
  provider: "github";
  createdAt: string;
};

export type StoredMcpConnection = {
  connectionId: string;
  workspaceId: WorkspaceId;
  serverUrl: string;
  allowedTools: string[];
  credentialRef: string;
  provider: "mcp";
  createdAt: string;
};

export type StoredConnection = StoredGithubConnection | StoredMcpConnection;

export type ConnectGithubInput = {
  workspaceId: WorkspaceId;
  installationId: string;
  /** Token or installation access token — stored server-side only at connect time. */
  accessToken: string;
  connectionId?: string;
  createdAt?: string;
};

export type ConnectMcpInput = {
  workspaceId: WorkspaceId;
  serverUrl: string;
  allowedTools: readonly string[];
  /** Bearer token for the remote MCP server — stored server-side only at connect time. */
  accessToken: string;
  connectionId?: string;
  createdAt?: string;
};

function generateConnectionId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `conn_${suffix}`.slice(0, 28);
}

function generateCredentialRef(): string {
  const suffix = randomBytes(12).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `cred_${suffix}`.slice(0, 32);
}

/**
 * Workspace-scoped tool connections with isolated credential storage (PRODUCT §10.3).
 * One GitHub connection per workspace for the MVP wedge (Use Case D).
 */
export class ConnectionStore {
  readonly workspace: WorkspaceStore;
  readonly #connections = new Map<string, StoredConnection>();
  readonly #byWorkspaceGithub = new Map<WorkspaceId, string>();
  readonly #byWorkspaceMcp = new Map<WorkspaceId, string>();
  /** Server-side only — never serialized to agents or public API bodies. */
  readonly #credentialVault = new Map<string, string>();

  constructor(workspace?: WorkspaceStore) {
    this.workspace = workspace ?? new WorkspaceStore();
  }

  connectGithub(input: ConnectGithubInput): StoredGithubConnection {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    if (!this.workspace.getWorkspace(input.workspaceId)) {
      throw new Error(`Unknown workspace: ${input.workspaceId}`);
    }
    if (!input.installationId.trim() || !input.accessToken.trim()) {
      throw new Error("installationId and accessToken are required");
    }
    const existingId = this.#byWorkspaceGithub.get(input.workspaceId);
    if (existingId) {
      throw new Error(
        "GitHub connection already exists for workspace; revoke or rotate via P-021",
      );
    }

    const credentialRef = generateCredentialRef();
    const connectionId = input.connectionId ?? generateConnectionId();
    const record: StoredGithubConnection = {
      connectionId,
      workspaceId: input.workspaceId,
      installationId: input.installationId,
      credentialRef,
      provider: "github",
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#connections.set(connectionId, record);
    this.#byWorkspaceGithub.set(input.workspaceId, connectionId);
    this.#credentialVault.set(credentialRef, input.accessToken);
    return record;
  }

  getGithubConnection(
    connectionId: string,
    workspaceId: WorkspaceId,
  ): StoredGithubConnection | undefined {
    const row = this.#connections.get(connectionId);
    if (!row || row.provider !== "github" || row.workspaceId !== workspaceId) {
      return undefined;
    }
    return row;
  }

  getGithubConnectionForWorkspace(
    workspaceId: WorkspaceId,
  ): StoredGithubConnection | undefined {
    const id = this.#byWorkspaceGithub.get(workspaceId);
    if (!id) {
      return undefined;
    }
    const row = this.#connections.get(id);
    return row && row.provider === "github" ? row : undefined;
  }

  listGithubConnections(workspaceId: WorkspaceId): StoredGithubConnection[] {
    const id = this.#byWorkspaceGithub.get(workspaceId);
    if (!id) {
      return [];
    }
    const row = this.#connections.get(id);
    return row && row.provider === "github" ? [row] : [];
  }

  connectMcp(input: ConnectMcpInput): StoredMcpConnection {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    if (!this.workspace.getWorkspace(input.workspaceId)) {
      throw new Error(`Unknown workspace: ${input.workspaceId}`);
    }
    if (!input.serverUrl.trim() || !input.accessToken.trim()) {
      throw new Error("serverUrl and accessToken are required");
    }
    const tools = [...input.allowedTools].map((t) => t.trim()).filter(Boolean);
    if (tools.length === 0) {
      throw new Error("allowedTools must include at least one tool name");
    }
    const existingId = this.#byWorkspaceMcp.get(input.workspaceId);
    if (existingId) {
      throw new Error(
        "MCP connection already exists for workspace; revoke or rotate via P-021",
      );
    }

    const credentialRef = generateCredentialRef();
    const connectionId = input.connectionId ?? generateConnectionId();
    const record: StoredMcpConnection = {
      connectionId,
      workspaceId: input.workspaceId,
      serverUrl: input.serverUrl.trim(),
      allowedTools: tools,
      credentialRef,
      provider: "mcp",
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.#connections.set(connectionId, record);
    this.#byWorkspaceMcp.set(input.workspaceId, connectionId);
    this.#credentialVault.set(credentialRef, input.accessToken);
    return record;
  }

  getMcpConnection(
    connectionId: string,
    workspaceId: WorkspaceId,
  ): StoredMcpConnection | undefined {
    const row = this.#connections.get(connectionId);
    if (!row || row.provider !== "mcp" || row.workspaceId !== workspaceId) {
      return undefined;
    }
    return row;
  }

  listMcpConnections(workspaceId: WorkspaceId): StoredMcpConnection[] {
    const id = this.#byWorkspaceMcp.get(workspaceId);
    if (!id) {
      return [];
    }
    const row = this.#connections.get(id);
    return row && row.provider === "mcp" ? [row] : [];
  }

  listConnections(workspaceId: WorkspaceId): StoredConnection[] {
    return [
      ...this.listGithubConnections(workspaceId),
      ...this.listMcpConnections(workspaceId),
    ];
  }

  /** Internal: resolve token for authorized server-side execution only. */
  resolveCredential(credentialRef: string): string | undefined {
    return this.#credentialVault.get(credentialRef);
  }
}
