import type { ActorAddress } from "@acpp/core";
import type { AuthorizationDecision } from "@acpp/policy";

export type ExecutionOutcome =
  | { status: "succeeded"; externalRef?: string }
  | { status: "failed"; error: string }
  | { status: "unknown"; note: string }
  | { status: "denied"; reason: string };

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

export type ReceiptChainStep = {
  phase: "signal" | "verification" | "decision" | "execution";
  label: string;
  detail: string;
  ok: boolean;
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

export function executionOutcomeFromGithub(result: {
  ok: boolean;
  externalRef?: string;
  error?: string;
}): ExecutionOutcome {
  if (result.ok) {
    return { status: "succeeded", externalRef: result.externalRef };
  }
  if (result.error === "unauthorized") {
    return { status: "denied", reason: "policy_denied" };
  }
  if (
    result.error === "outcome_unknown" ||
    result.error === "timeout" ||
    result.error === "aborted" ||
    result.error === "network_error"
  ) {
    return {
      status: "unknown",
      note: result.error === "timeout"
        ? "Downstream timed out; side effect may have completed"
        : "Downstream response lost or ambiguous; side effect may have completed",
    };
  }
  return { status: "failed", error: result.error ?? "execution_failed" };
}

export function executionOutcomeFromGate(gate: {
  allowed: boolean;
  reason: string;
}): ExecutionOutcome {
  if (gate.allowed) {
    return { status: "unknown", note: "authorized_not_executed" };
  }
  return { status: "denied", reason: gate.reason };
}

/**
 * Ordered steps for dashboard / inspector: signal → verification → decision → outcome.
 */
export function describeReceiptChain(
  receipt: Receipt,
  signalSummary?: { type: string; correlationId?: string },
): ReceiptChainStep[] {
  const signalDetail = signalSummary
    ? `${signalSummary.type}${signalSummary.correlationId ? ` (${signalSummary.correlationId})` : ""}`
    : receipt.signalId;

  const steps: ReceiptChainStep[] = [
    {
      phase: "signal",
      label: "Signal",
      detail: signalDetail,
      ok: true,
    },
    {
      phase: "verification",
      label: "Identity verification",
      detail: receipt.verificationOk ? "Sender signature valid" : "Verification failed",
      ok: receipt.verificationOk,
    },
    {
      phase: "decision",
      label: "Authorization decision",
      detail: `${receipt.decision.allow ? "Allow" : "Deny"} — ${receipt.decision.reason}`,
      ok: receipt.decision.allow,
    },
  ];

  const exec = receipt.execution;
  if (exec.status === "succeeded") {
    steps.push({
      phase: "execution",
      label: "Execution outcome",
      detail: exec.externalRef ? `Succeeded (${exec.externalRef})` : "Succeeded",
      ok: true,
    });
  } else if (exec.status === "denied") {
    steps.push({
      phase: "execution",
      label: "Execution outcome",
      detail: `Denied — ${exec.reason}`,
      ok: false,
    });
  } else if (exec.status === "failed") {
    steps.push({
      phase: "execution",
      label: "Execution outcome",
      detail: `Failed — ${exec.error}`,
      ok: false,
    });
  } else {
    steps.push({
      phase: "execution",
      label: "Execution outcome",
      detail: exec.note,
      ok: false,
    });
  }

  return steps;
}
