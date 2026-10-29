export {
  approvalIdFromProof,
  assertProofMatchesDecision,
  buildExecutionAuthorizationProof,
  type ExecutionAuthorizationProof,
} from "./authz.js";
export { AcppHostedClient, type AcppHostedClientOptions } from "./client.js";
export {
  ProtectedOperationError,
  type ProtectedOperationErrorCode,
} from "./errors.js";
export {
  signSignalEnvelope,
  verifySignalEnvelopeSignature,
  type SignalSigningMaterial,
  type UnsignedSignalDraft,
} from "./signals.js";

export type { ActorAddress, SignalEnvelope, SignalType } from "@acpp/core";
export {
  createKeyId,
  generateEd25519KeyPair,
  signMessage,
  verifyIdentitySignature,
  verifyMessage,
} from "@acpp/identity";
export {
  envelopeContentHash,
  signingMessage,
  validateSignalEnvelope,
} from "@acpp/signals";
export {
  evaluateGrant,
  gateProtectedAction,
  hashActionPayload,
  type ApprovalRecord,
  type ApprovalRequest,
  type ApprovalRequestStatus,
  type AuthorizationDecision,
  type ExecutionGate,
  type PermissionGrant,
} from "@acpp/policy";
export {
  buildReceipt,
  describeReceiptChain,
  executionOutcomeFromGate,
  executionOutcomeFromGithub,
  receiptImpliesExternalSuccess,
  type Receipt,
} from "@acpp/receipts";
