/** Thrown when SDK helpers would hide an explicit human or policy decision (PRODUCT §17.2). */
export type ProtectedOperationErrorCode =
  | "authorization_denied"
  | "approval_required"
  | "proof_decision_mismatch";

export class ProtectedOperationError extends Error {
  readonly code: ProtectedOperationErrorCode;

  constructor(code: ProtectedOperationErrorCode, message: string) {
    super(message);
    this.name = "ProtectedOperationError";
    this.code = code;
  }
}
