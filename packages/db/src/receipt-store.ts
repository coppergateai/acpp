import { randomBytes } from "node:crypto";
import type { ActorAddress } from "@acpp/core";
import type { AuthorizationDecision } from "@acpp/policy";
import {
  buildReceipt,
  type ExecutionOutcome,
  type Receipt,
} from "@acpp/receipts";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";
import { WorkspaceStore } from "./workspace-store.js";

export type StoredReceipt = Receipt & {
  workspaceId: WorkspaceId;
};

export type RecordReceiptInput = {
  receiptId?: string;
  workspaceId: WorkspaceId;
  signalId: string;
  sender: ActorAddress;
  verificationOk: boolean;
  decision: AuthorizationDecision;
  approvalId?: string;
  execution: ExecutionOutcome;
  createdAt?: string;
};

function generateReceiptId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `rcpt_${suffix}`.slice(0, 28);
}

/**
 * In-memory receipt store scoped to workspaces (PRODUCT §13.2 Receipts).
 */
export class ReceiptStore {
  readonly workspace: WorkspaceStore;
  readonly #byId = new Map<string, StoredReceipt>();
  readonly #bySignalId = new Map<string, string>();

  constructor(workspace?: WorkspaceStore) {
    this.workspace = workspace ?? new WorkspaceStore();
  }

  recordReceipt(input: RecordReceiptInput): StoredReceipt {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    if (!this.workspace.getWorkspace(input.workspaceId)) {
      throw new Error(`Unknown workspace: ${input.workspaceId}`);
    }

    const receiptId = input.receiptId ?? generateReceiptId();
    if (this.#byId.has(receiptId)) {
      throw new Error(`Receipt id conflict: ${receiptId}`);
    }
    const existingForSignal = this.#bySignalId.get(input.signalId);
    if (existingForSignal) {
      throw new Error(`Receipt already recorded for signal: ${input.signalId}`);
    }

    const receipt = buildReceipt({
      receiptId,
      signalId: input.signalId,
      sender: input.sender,
      verificationOk: input.verificationOk,
      decision: input.decision,
      approvalId: input.approvalId,
      execution: input.execution,
      createdAt: input.createdAt,
    });

    const stored: StoredReceipt = { ...receipt, workspaceId: input.workspaceId };
    this.#byId.set(receiptId, stored);
    this.#bySignalId.set(input.signalId, receiptId);
    return stored;
  }

  getReceipt(receiptId: string, workspaceId: WorkspaceId): StoredReceipt | undefined {
    const row = this.#byId.get(receiptId);
    if (!row || row.workspaceId !== workspaceId) {
      return undefined;
    }
    return row;
  }

  getReceiptBySignalId(
    signalId: string,
    workspaceId: WorkspaceId,
  ): StoredReceipt | undefined {
    const receiptId = this.#bySignalId.get(signalId);
    if (!receiptId) {
      return undefined;
    }
    return this.getReceipt(receiptId, workspaceId);
  }

  listReceipts(input: { workspaceId: WorkspaceId }): StoredReceipt[] {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    return [...this.#byId.values()].filter(
      (r) => r.workspaceId === input.workspaceId,
    );
  }
}
