import type { SignalExecutionState } from "./signal-categories.js";

/** PRODUCT §14.5 — terminal execution states (no further automatic progression). */
export const EXECUTION_TERMINAL_STATES: ReadonlySet<SignalExecutionState> =
  new Set([
    "succeeded",
    "failed",
    "rejected",
    "cancelled",
    "outcome_unknown",
  ]);

const ALLOWED_TRANSITIONS: Readonly<
  Record<SignalExecutionState, readonly SignalExecutionState[]>
> = {
  not_started: ["authorized", "awaiting_approval", "rejected"],
  authorized: ["running", "cancelled"],
  awaiting_approval: ["authorized", "rejected", "cancelled"],
  running: ["succeeded", "failed", "outcome_unknown", "cancelled"],
  succeeded: [],
  failed: [],
  rejected: [],
  cancelled: [],
  outcome_unknown: [],
};

export function isTerminalExecutionState(state: SignalExecutionState): boolean {
  return EXECUTION_TERMINAL_STATES.has(state);
}

export function assertExecutionTransition(
  from: SignalExecutionState,
  to: SignalExecutionState,
): void {
  if (from === to) {
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid execution transition: ${from} → ${to}`);
  }
}

/**
 * PRODUCT §14.5 — the gateway must not blindly repeat side effects when outcome is uncertain.
 */
export function allowsBlindRetry(state: SignalExecutionState): boolean {
  return state !== "outcome_unknown";
}
