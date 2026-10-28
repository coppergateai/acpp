import type { SignalEnvelope } from "@acpp/core";
import {
  isSignalReferenceId,
  signalCategoryRequiresCorrelation,
} from "@acpp/core";

export type CategoryValidationError =
  | "missing_correlation_id"
  | "invalid_correlation_id"
  | "invalid_causation_id";

/**
 * Category-specific envelope rules (PRODUCT §8.1, §8.3 correlation behavior).
 */
export function validateSignalCategoryRules(
  envelope: Pick<SignalEnvelope, "type" | "correlationId" | "causationId">,
): { ok: true } | { ok: false; reason: CategoryValidationError } {
  if (envelope.correlationId !== undefined && !isSignalReferenceId(envelope.correlationId)) {
    return { ok: false, reason: "invalid_correlation_id" };
  }
  if (envelope.causationId !== undefined && !isSignalReferenceId(envelope.causationId)) {
    return { ok: false, reason: "invalid_causation_id" };
  }
  if (signalCategoryRequiresCorrelation(envelope.type) && !envelope.correlationId) {
    return { ok: false, reason: "missing_correlation_id" };
  }
  return { ok: true };
}
