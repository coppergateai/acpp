import { createHash } from "node:crypto";
import type { ActorAddress, SignalEnvelope, SignalType } from "@acpp/core";
import { ACPP_PROTOCOL_VERSION, isActorAddress } from "@acpp/core";
import { validateSignalCategoryRules } from "./categories.js";

const SIGNAL_TYPES: SignalType[] = [
  "event",
  "request",
  "offer",
  "response",
  "approval",
  "revocation",
];

/** Security-relevant envelope fields covered by Ed25519 signatures (S-010). */
export type SignableSignalFields = {
  protocolVersion: string;
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
  auth: {
    alg: "Ed25519";
    keyId: string;
  };
};

function normalizeAudience(
  audience: ActorAddress | ActorAddress[],
): ActorAddress | ActorAddress[] {
  if (Array.isArray(audience)) {
    return [...audience].sort();
  }
  return audience;
}

function stableValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = stableValue(obj[key]);
  }
  return out;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function extractSignableFields(envelope: SignalEnvelope): SignableSignalFields {
  if (!envelope.auth || envelope.auth.alg !== "Ed25519" || !envelope.auth.keyId) {
    throw new Error("missing_auth");
  }
  return {
    protocolVersion: envelope.protocolVersion,
    signalId: envelope.signalId,
    type: envelope.type,
    sender: envelope.sender,
    audience: normalizeAudience(envelope.audience),
    createdAt: envelope.createdAt,
    ...(envelope.expiresAt !== undefined ? { expiresAt: envelope.expiresAt } : {}),
    ...(envelope.correlationId !== undefined
      ? { correlationId: envelope.correlationId }
      : {}),
    ...(envelope.causationId !== undefined ? { causationId: envelope.causationId } : {}),
    contentType: envelope.contentType,
    payload: envelope.payload,
    auth: {
      alg: "Ed25519",
      keyId: envelope.auth.keyId,
    },
  };
}

/** UTF-8 bytes signed by the sender (docs/protocol/signal.md). */
export function signingMessage(envelope: SignalEnvelope): string {
  return stableStringify(extractSignableFields(envelope));
}

export function envelopeContentHash(envelope: SignalEnvelope): string {
  const digest = createHash("sha256").update(signingMessage(envelope)).digest("base64url");
  return `sig_${digest.slice(0, 32)}`;
}

export const MAX_SIGNAL_PAYLOAD_BYTES = 256 * 1024;

export type EnvelopeValidationError =
  | "invalid_protocol_version"
  | "invalid_signal_id"
  | "invalid_type"
  | "invalid_sender"
  | "invalid_audience"
  | "invalid_created_at"
  | "invalid_expires_at"
  | "invalid_content_type"
  | "missing_auth"
  | "invalid_auth_alg"
  | "payload_too_large"
  | "missing_correlation_id"
  | "invalid_correlation_id"
  | "invalid_causation_id";

export function validateSignalEnvelope(
  envelope: SignalEnvelope,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: EnvelopeValidationError } {
  if (envelope.protocolVersion !== ACPP_PROTOCOL_VERSION) {
    return { ok: false, reason: "invalid_protocol_version" };
  }
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(envelope.signalId)) {
    return { ok: false, reason: "invalid_signal_id" };
  }
  if (!SIGNAL_TYPES.includes(envelope.type)) {
    return { ok: false, reason: "invalid_type" };
  }
  const categoryRules = validateSignalCategoryRules(envelope);
  if (!categoryRules.ok) {
    return { ok: false, reason: categoryRules.reason };
  }
  if (!isActorAddress(envelope.sender)) {
    return { ok: false, reason: "invalid_sender" };
  }
  const audiences = Array.isArray(envelope.audience)
    ? envelope.audience
    : [envelope.audience];
  if (audiences.length === 0 || audiences.some((a) => !isActorAddress(a))) {
    return { ok: false, reason: "invalid_audience" };
  }
  if (Number.isNaN(Date.parse(envelope.createdAt))) {
    return { ok: false, reason: "invalid_created_at" };
  }
  if (envelope.expiresAt !== undefined && Number.isNaN(Date.parse(envelope.expiresAt))) {
    return { ok: false, reason: "invalid_expires_at" };
  }
  if (typeof envelope.contentType !== "string" || envelope.contentType.length === 0) {
    return { ok: false, reason: "invalid_content_type" };
  }
  if (!envelope.auth?.keyId || !envelope.auth.signature) {
    return { ok: false, reason: "missing_auth" };
  }
  if (envelope.auth.alg !== "Ed25519") {
    return { ok: false, reason: "invalid_auth_alg" };
  }
  const payloadBytes = Buffer.byteLength(
    stableStringify(envelope.payload ?? null),
    "utf8",
  );
  if (payloadBytes > MAX_SIGNAL_PAYLOAD_BYTES) {
    return { ok: false, reason: "payload_too_large" };
  }
  if (envelope.expiresAt && Date.parse(envelope.expiresAt) <= now.getTime()) {
    return { ok: false, reason: "invalid_expires_at" };
  }
  return { ok: true };
}
