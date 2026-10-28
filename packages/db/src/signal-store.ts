import type { SignalEnvelope } from "@acpp/core";
import {
  envelopeContentHash,
  signingMessage,
  validateSignalEnvelope,
} from "@acpp/signals";
import { isWorkspaceId, type WorkspaceId } from "./workspace-model.js";
import type { IdentityRegistry } from "./identity-store.js";

export type SignalRecord = {
  signalId: string;
  workspaceId: WorkspaceId;
  contentHash: string;
  envelope: SignalEnvelope;
  receivedAt: string;
};

export type SignalDeliveryStatus = "accepted" | "rejected";

export type SignalDeliveryRecord = {
  deliveryId: string;
  signalId: string;
  status: SignalDeliveryStatus;
  reason?: string;
  processedAt: string;
};

export type SubmitSignalResult =
  | {
      ok: true;
      created: boolean;
      signal: SignalRecord;
      delivery: SignalDeliveryRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid_envelope"
        | "invalid_signature"
        | "unknown_identity"
        | "identity_suspended"
        | "identity_revoked"
        | "unknown_key"
        | "key_not_active"
        | "replay_rejected"
        | "signal_id_conflict";
      detail?: string;
      existing?: { signal: SignalRecord; delivery: SignalDeliveryRecord };
    };

/**
 * In-memory Signal + SignalDelivery persistence (PRODUCT §14.4).
 * PostgreSQL/Drizzle migrations follow the same logical model.
 */
export class SignalStore {
  readonly #signals = new Map<string, SignalRecord>();
  readonly #deliveries = new Map<string, SignalDeliveryRecord>();
  readonly #identity: IdentityRegistry;

  constructor(identity: IdentityRegistry) {
    this.#identity = identity;
  }

  getSignal(signalId: string): SignalRecord | undefined {
    return this.#signals.get(signalId);
  }

  getDelivery(signalId: string): SignalDeliveryRecord | undefined {
    return this.#deliveries.get(signalId);
  }

  submitSignal(
    envelope: SignalEnvelope,
    options: { now?: Date; deliveryId?: string } = {},
  ): SubmitSignalResult {
    const now = options.now ?? new Date();
    const validation = validateSignalEnvelope(envelope, now);
    if (!validation.ok) {
      return {
        ok: false,
        reason: "invalid_envelope",
        detail: validation.reason,
      };
    }

    const contentHash = envelopeContentHash(envelope);
    const existing = this.#signals.get(envelope.signalId);
    if (existing) {
      const delivery = this.#deliveries.get(envelope.signalId);
      if (!delivery) {
        throw new Error(`Invariant: signal without delivery ${envelope.signalId}`);
      }
      if (existing.contentHash !== contentHash) {
        return {
          ok: false,
          reason: "signal_id_conflict",
          existing: { signal: existing, delivery },
        };
      }
      return {
        ok: false,
        reason: "replay_rejected",
        existing: { signal: existing, delivery },
      };
    }

    const identity = this.#identity.getIdentity(envelope.sender);
    if (!identity) {
      return { ok: false, reason: "unknown_identity" };
    }

    const verify = this.#identity.verifySignature({
      address: envelope.sender,
      keyId: envelope.auth!.keyId,
      message: signingMessage(envelope),
      signature: envelope.auth!.signature,
    });
    if (!verify.ok) {
      const reason =
        verify.reason === "unknown_identity"
          ? "unknown_identity"
          : verify.reason === "identity_suspended"
            ? "identity_suspended"
            : verify.reason === "identity_revoked"
              ? "identity_revoked"
              : verify.reason === "unknown_key"
                ? "unknown_key"
                : verify.reason === "key_not_active"
                  ? "key_not_active"
                  : "invalid_signature";
      return { ok: false, reason };
    }

    if (!isWorkspaceId(identity.workspaceId)) {
      return { ok: false, reason: "invalid_envelope", detail: "invalid_workspace" };
    }

    const receivedAt = now.toISOString();
    const signal: SignalRecord = {
      signalId: envelope.signalId,
      workspaceId: identity.workspaceId,
      contentHash,
      envelope,
      receivedAt,
    };
    const delivery: SignalDeliveryRecord = {
      deliveryId: options.deliveryId ?? `dlv_${envelope.signalId}`,
      signalId: envelope.signalId,
      status: "accepted",
      processedAt: receivedAt,
    };

    this.#signals.set(signal.signalId, signal);
    this.#deliveries.set(signal.signalId, delivery);

    return {
      ok: true,
      created: true,
      signal,
      delivery,
    };
  }
}
