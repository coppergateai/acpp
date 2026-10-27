import type { ActorAddress } from "@acpp/core";
import type { AuthorizationDecision } from "@acpp/policy";

export type ExecutionOutcome =
  | { status: "succeeded"; externalRef?: string }
  | { status: "failed"; error: string }
  | { status: "unknown"; note: string };

/**
 * Receipts must never claim external success when the outcome is unknown.
 */
export type Receipt = {
  receiptId: string;
  signalId: string;
  sender: ActorAddress;
  verificationOk: boolean;
  decision: AuthorizationDecision;
  approvalId?: string;
  execution: ExecutionOutcome;
  createdAt: string;
};

export function buildReceipt(input: {
  receiptId: string;
  signalId: string;
  sender: ActorAddress;
  verificationOk: boolean;
  decision: AuthorizationDecision;
  approvalId?: string;
  execution: ExecutionOutcome;
  createdAt?: string;
}): Receipt {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function receiptImpliesExternalSuccess(receipt: Receipt): boolean {
  return receipt.execution.status === "succeeded";
}
