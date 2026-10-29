import { randomBytes } from "node:crypto";
import type { ActorAddress, SignalExecutionState } from "@acpp/core";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";

export type TerminalExecutionState = Extract<
  SignalExecutionState,
  | "succeeded"
  | "failed"
  | "rejected"
  | "cancelled"
  | "outcome_unknown"
>;

export type StoredExecution = {
  executionId: string;
  workspaceId: WorkspaceId;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  signalId?: string;
  connectionId?: string;
  idempotencyKey?: string;
  state: SignalExecutionState;
  createdAt: string;
  updatedAt: string;
  note?: string;
};

export type StartExecutionInput = {
  executionId?: string;
  workspaceId: WorkspaceId;
  subject: ActorAddress;
  resource: string;
  action: string;
  payloadHash: string;
  signalId?: string;
  connectionId?: string;
  idempotencyKey?: string;
  createdAt?: string;
};

/** Actions that must not be blindly retried when outcome is uncertain (PRODUCT §14.5). */
export const NON_IDEMPOTENT_ACTIONS = new Set<string>(["issues.comment"]);

function generateExecutionId(): string {
  const suffix = randomBytes(8).toString("base64url").replace(/[^A-Za-z0-9_-]/g, "");
  return `exec_${suffix}`.slice(0, 28);
}

function isTerminal(state: SignalExecutionState): boolean {
  return (
    state === "succeeded" ||
    state === "failed" ||
    state === "rejected" ||
    state === "cancelled" ||
    state === "outcome_unknown"
  );
}

/**
 * In-memory execution lifecycle tracker (PRODUCT §14.5 / P-021).
 * Signal gateway delivery stays at `not_started`; this store advances side-effect states.
 */
export class ExecutionStore {
  readonly #executions = new Map<string, StoredExecution>();

  start(input: StartExecutionInput): StoredExecution {
    if (!isWorkspaceId(input.workspaceId)) {
      throw new Error(`Invalid workspace id: ${input.workspaceId}`);
    }
    const now = input.createdAt ?? new Date().toISOString();
    const executionId = input.executionId ?? generateExecutionId();
    if (this.#executions.has(executionId)) {
      throw new Error(`Execution already exists: ${executionId}`);
    }
    const row: StoredExecution = {
      executionId,
      workspaceId: input.workspaceId,
      subject: input.subject,
      resource: input.resource,
      action: input.action,
      payloadHash: input.payloadHash,
      signalId: input.signalId,
      connectionId: input.connectionId,
      idempotencyKey: input.idempotencyKey,
      state: "not_started",
      createdAt: now,
      updatedAt: now,
    };
    this.#executions.set(executionId, row);
    return row;
  }

  get(executionId: string): StoredExecution | undefined {
    return this.#executions.get(executionId);
  }

  setState(
    executionId: string,
    state: SignalExecutionState,
    options: { note?: string; at?: string } = {},
  ): StoredExecution {
    const row = this.#executions.get(executionId);
    if (!row) {
      throw new Error(`Unknown execution: ${executionId}`);
    }
    if (isTerminal(row.state) && row.state !== state) {
      throw new Error(`Execution already terminal: ${executionId}`);
    }
    const updated: StoredExecution = {
      ...row,
      state,
      note: options.note ?? row.note,
      updatedAt: options.at ?? new Date().toISOString(),
    };
    this.#executions.set(executionId, updated);
    return updated;
  }

  /**
   * Find an in-flight or outcome_unknown execution for the same action binding.
   * Used to refuse blind retries of non-idempotent operations.
   */
  findAmbiguousRetryCandidate(filter: {
    workspaceId: WorkspaceId;
    subject: ActorAddress;
    resource: string;
    action: string;
    payloadHash: string;
    connectionId?: string;
  }): StoredExecution | undefined {
    for (const row of this.#executions.values()) {
      if (row.workspaceId !== filter.workspaceId) continue;
      if (row.subject !== filter.subject) continue;
      if (row.resource !== filter.resource) continue;
      if (row.action !== filter.action) continue;
      if (row.payloadHash !== filter.payloadHash) continue;
      if (
        filter.connectionId !== undefined &&
        row.connectionId !== filter.connectionId
      ) {
        continue;
      }
      if (row.state === "running" || row.state === "outcome_unknown") {
        return row;
      }
    }
    return undefined;
  }

  findByIdempotencyKey(
    workspaceId: WorkspaceId,
    idempotencyKey: string,
  ): StoredExecution | undefined {
    for (const row of this.#executions.values()) {
      if (
        row.workspaceId === workspaceId &&
        row.idempotencyKey === idempotencyKey
      ) {
        return row;
      }
    }
    return undefined;
  }

  /**
   * Refuse blind retry when a prior non-idempotent attempt is still running
   * or ended in outcome_unknown, unless the caller supplies the same idempotencyKey.
   */
  assertBlindRetryAllowed(input: {
    workspaceId: WorkspaceId;
    subject: ActorAddress;
    resource: string;
    action: string;
    payloadHash: string;
    connectionId?: string;
    idempotencyKey?: string;
  }): { allowed: true } | { allowed: false; prior: StoredExecution; reason: string } {
    if (!NON_IDEMPOTENT_ACTIONS.has(input.action)) {
      return { allowed: true };
    }
    const prior = this.findAmbiguousRetryCandidate(input);
    if (!prior) {
      return { allowed: true };
    }
    if (
      input.idempotencyKey &&
      prior.idempotencyKey &&
      input.idempotencyKey === prior.idempotencyKey
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      prior,
      reason:
        prior.state === "running"
          ? "execution_still_running"
          : "outcome_unknown_no_blind_retry",
    };
  }
}
