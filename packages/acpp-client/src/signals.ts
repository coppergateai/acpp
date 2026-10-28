import { ACPP_PROTOCOL_VERSION, type SignalEnvelope } from "@acpp/core";
import { signMessage, type Ed25519Material } from "@acpp/identity";
import { signingMessage } from "@acpp/signals";

export type SignSignalInput = {
  material: Ed25519Material;
  keyId: string;
  sender: SignalEnvelope["sender"];
  signalId: string;
  type?: SignalEnvelope["type"];
  audience?: SignalEnvelope["audience"];
  payload?: unknown;
  correlationId?: string;
  causationId?: string;
};

/** Build and sign a signal envelope (does not submit — no auto-execution). */
export function signSignalEnvelope(input: SignSignalInput): SignalEnvelope {
  const partial: SignalEnvelope = {
    protocolVersion: ACPP_PROTOCOL_VERSION,
    signalId: input.signalId,
    type: input.type ?? "event",
    sender: input.sender,
    audience: input.audience ?? input.sender,
    createdAt: new Date().toISOString(),
    contentType: "application/json",
    payload: input.payload ?? {},
    auth: { alg: "Ed25519", keyId: input.keyId, signature: "" },
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(input.causationId ? { causationId: input.causationId } : {}),
  };
  const signature = signMessage(signingMessage(partial), input.material.privateKey);
  return { ...partial, auth: { alg: "Ed25519", keyId: input.keyId, signature } };
}
