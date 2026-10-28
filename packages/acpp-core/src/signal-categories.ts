export type SignalType =
  | "event"
  | "request"
  | "offer"
  | "response"
  | "approval"
  | "revocation";

/** Thread / reference identifiers (correlationId, causationId, signalId). */
export const SIGNAL_REFERENCE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function isSignalReferenceId(value: string): boolean {
  return SIGNAL_REFERENCE_ID_PATTERN.test(value);
}

export type SignalCategoryDefinition = {
  type: SignalType;
  summary: string;
  /** When true, `correlationId` is required on the envelope. */
  requiresCorrelationId: boolean;
};

/** PRODUCT §8.1 — MVP signal categories. */
export const SIGNAL_CATEGORY_CATALOG: readonly SignalCategoryDefinition[] = [
  {
    type: "event",
    summary: "Something happened",
    requiresCorrelationId: false,
  },
  {
    type: "request",
    summary: "Request an outcome",
    requiresCorrelationId: false,
  },
  {
    type: "offer",
    summary: "Advertise a capability or resource",
    requiresCorrelationId: false,
  },
  {
    type: "response",
    summary: "Reply to a prior request or thread",
    requiresCorrelationId: true,
  },
  {
    type: "approval",
    summary: "Explicit approve or reject of a protected operation",
    requiresCorrelationId: true,
  },
  {
    type: "revocation",
    summary: "Invalidate a grant, credential, or delegation",
    requiresCorrelationId: false,
  },
] as const;

export function signalCategoryRequiresCorrelation(type: SignalType): boolean {
  const row = SIGNAL_CATEGORY_CATALOG.find((c) => c.type === type);
  return row?.requiresCorrelationId ?? false;
}

/**
 * Gateway delivery acknowledgement (PRODUCT §8.4).
 * Distinct from execution / side-effect outcome (see SignalExecutionState).
 */
export type SignalDeliveryAckState = "acknowledged" | "rejected";

/**
 * Execution lifecycle for side effects (PRODUCT §14.5).
 * Signal gateway delivery never advances this past `not_started`.
 */
export type SignalExecutionState =
  | "not_started"
  | "authorized"
  | "awaiting_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "rejected"
  | "cancelled"
  | "outcome_unknown";
