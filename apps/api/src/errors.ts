import type { ErrorCode } from "@eaimesa/shared";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode | string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
