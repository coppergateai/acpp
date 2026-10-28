import {
  ACPP_PROTOCOL_VERSION,
  type ActorAddress,
  type SignalEnvelope,
  type SignalType,
} from "@acpp/core";
import { createKeyId, signMessage, verifyMessage } from "@acpp/identity";
import { signingMessage, validateSignalEnvelope } from "@acpp/signals";
import type { KeyObject } from "node:crypto";

export type SignalSigningMaterial = {
  sender: ActorAddress;
  /** Raw Ed25519 public key (base64url). Used for local verification. */
  publicKey: string;
  privateKey: KeyObject;
  keyId?: string;
};

export type UnsignedSignalDraft = {
  signalId: string;
  type: SignalType;
  audience: ActorAddress | ActorAddress[];
  createdAt?: string;
  expiresAt?: string;
  correlationId?: string;
  causationId?: string;
  contentType: string;
  payload: unknown;
};

/**
 * Construct a protocol-valid envelope and attach an Ed25519 signature over signable fields.
 */
export function signSignalEnvelope(
  draft: UnsignedSignalDraft,
  material: SignalSigningMaterial,
): SignalEnvelope {
  const keyId = material.keyId ?? createKeyId(material.publicKey);
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId: draft.signalId,
    type: draft.type,
    sender: material.sender,
    audience: draft.audience,
    createdAt: draft.createdAt ?? new Date().toISOString(),
    ...(draft.expiresAt !== undefined ? { expiresAt: draft.expiresAt } : {}),
    ...(draft.correlationId !== undefined ? { correlationId: draft.correlationId } : {}),
    ...(draft.causationId !== undefined ? { causationId: draft.causationId } : {}),
    contentType: draft.contentType,
    payload: draft.payload,
    auth: { alg: "Ed25519", keyId, signature: "" },
  };
  const signature = signMessage(signingMessage(partial), material.privateKey);
  const envelope: SignalEnvelope = {
    ...partial,
    auth: { alg: "Ed25519", keyId, signature },
  };
  const validation = validateSignalEnvelope(envelope);
  if (!validation.ok) {
    throw new Error(`invalid_envelope:${validation.reason}`);
  }
  return envelope;
}

/** Local Ed25519 verification (identity proof only — not authorization). */
export function verifySignalEnvelopeSignature(
  envelope: SignalEnvelope,
  publicKey: string,
): boolean {
  if (!envelope.auth?.signature) {
    return false;
  }
  return verifyMessage(signingMessage(envelope), envelope.auth.signature, publicKey);
}
