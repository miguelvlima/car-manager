export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: AppErrorCode };

export function toActionResult(error: unknown): { ok: false; error: string; code: AppErrorCode } {
  if (error instanceof AppError) {
    return { ok: false, error: error.message, code: error.code };
  }
  console.error(error);
  return { ok: false, error: "Ocorreu um erro inesperado.", code: "VALIDATION" };
}
