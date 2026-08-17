/**
 * Typed application errors with user-safe messages.
 */

export type ErrorCode =
  | 'VALIDATION'
  | 'OFFLINE'
  | 'API'
  | 'AUTH_EXPIRED'
  | 'SYNC_FAILED'
  | 'DUPLICATE'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED';

export class AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  cause?: unknown;

  constructor(code: ErrorCode, userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

export function toUserMessage(err: unknown): string {
  if (err instanceof AppError) return err.userMessage;
  if (err instanceof Error && err.message) {
    // Avoid leaking raw technical internals; return a generic message.
    return 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function validationError(msg: string): AppError {
  return new AppError('VALIDATION', msg);
}

export function permissionDenied(msg = 'You do not have permission to perform this action.'): AppError {
  return new AppError('PERMISSION_DENIED', msg);
}

export function notFound(msg = 'Record not found.'): AppError {
  return new AppError('NOT_FOUND', msg);
}

export function syncFailed(msg = "Couldn't sync. Check your connection and try again."): AppError {
  return new AppError('SYNC_FAILED', msg);
}