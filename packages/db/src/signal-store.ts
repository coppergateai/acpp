import type { SignalDeliveryAckState, SignalEnvelope, SignalExecutionState } from "@acpp/core";
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

/** @deprecated Prefer `ackState`; retained for S-010 callers. */
export type SignalDeliveryStatus = "accepted" | "rejected";

export type SignalDeliveryRecord = {
  deliveryId: string;
  signalId: string;
  /** Legacy mirror of gateway accept/reject. */
  status: SignalDeliveryStatus;
  /** Explicit delivery acknowledgement (PRODUCT §8.4). */
  ackState: SignalDeliveryAckState;
  /**
   * Side-effect execution lifecycle (PRODUCT §14.5).
   * Gateway delivery leaves this at `not_started` — delivery ≠ execution.
   */
  executionState: SignalExecutionState;
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
        | "signal_id_conflict"
        | "unknown_causation";
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
  readonly #byCorrelation = new Map<string, Set<string>>();
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

  listSignalsByCorrelationId(correlationId: string): SignalRecord[] {
    const ids = this.#byCorrelation.get(correlationId);
    if (!ids) {
      return [];
    }
    const out: SignalRecord[] = [];
    for (const signalId of ids) {
      const record = this.#signals.get(signalId);
      if (record) {
        out.push(record);
      }
    }
    out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    return out;
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

    if (
      envelope.causationId !== undefined &&
      !this.#signals.has(envelope.causationId)
    ) {
      return { ok: false, reason: "unknown_causation" };
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
      ackState: "acknowledged",
      executionState: "not_started",
      processedAt: receivedAt,
    };

    this.#signals.set(signal.signalId, signal);
    this.#deliveries.set(signal.signalId, delivery);
    if (envelope.correlationId) {
      let bucket = this.#byCorrelation.get(envelope.correlationId);
      if (!bucket) {
        bucket = new Set();
        this.#byCorrelation.set(envelope.correlationId, bucket);
      }
      bucket.add(signal.signalId);
    }

    return {
      ok: true,
      created: true,
      signal,
      delivery,
    };
  }
}
