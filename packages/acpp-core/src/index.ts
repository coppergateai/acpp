import type { SignalType } from "./signal-categories.js";

/** ACPP protocol version for envelopes and APIs. */
export const ACPP_PROTOCOL_VERSION = "0.1.0" as const;

export type { SignalType };

export type ActorType = "human" | "agent" | "service" | "organization" | "application";

/** Stable ACPP actor address (not a handle). */
export type ActorAddress = `acpp:${ActorType}:${string}`;

/**
 * Transport-independent signal envelope (logical fields).
 * Wire format and canonicalization are specified in docs/protocol/signal.md.
 */
export type SignalEnvelope = {
  protocolVersion: typeof ACPP_PROTOCOL_VERSION | string;
  signalId: string;
  type: SignalType;
  sender: ActorAddress;
  audience: ActorAddress | ActorAddress[];
  createdAt: string;
  expiresAt?: string;
  correlationId?: string;
  causationId?: string;
  contentType: string;
  payload: unknown;
  /** Detached or attached authentication evidence (e.g. Ed25519 signature). */
  auth?: {
    alg: "Ed25519";
    keyId: string;
    signature: string;
  };
};

export function isActorAddress(value: string): value is ActorAddress {
  return /^acpp:(human|agent|service|organization|application):[A-Za-z0-9_-]+$/.test(
    value,
  );
}

export function createActorAddress(
  type: ActorType,
  id: string,
): ActorAddress {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid actor id: ${id}`);
  }
  return `acpp:${type}:${id}`;
}

export {
  isSignalReferenceId,
  SIGNAL_CATEGORY_CATALOG,
  SIGNAL_REFERENCE_ID_PATTERN,
  signalCategoryRequiresCorrelation,
  type SignalCategoryDefinition,
  type SignalDeliveryAckState,
  type SignalExecutionState,
} from "./signal-categories.js";
