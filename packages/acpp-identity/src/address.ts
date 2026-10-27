import { createActorAddress, type ActorAddress, type ActorType } from "@acpp/core";
import { randomBytes } from "node:crypto";

/** Opaque stable id segment for `acpp:{type}:{id}` addresses. */
export function newStableActorId(): string {
  const raw = randomBytes(16).toString("base64url");
  const sanitized = raw.replace(/[^A-Za-z0-9_-]/g, "_");
  if (!/^[A-Za-z0-9_-]+$/.test(sanitized)) {
    throw new Error("Failed to generate stable actor id");
  }
  return sanitized;
}

export function allocateActorAddress(type: ActorType): ActorAddress {
  return createActorAddress(type, newStableActorId());
}
