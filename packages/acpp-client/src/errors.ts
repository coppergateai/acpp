export class AcppHttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `ACPP HTTP ${status}`);
    this.name = "AcppHttpError";
    this.status = status;
    this.body = body;
  }
}
