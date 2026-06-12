/**
 * Custom application error class.
 * Used for throwing operational errors with specific HTTP status codes.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode; // compatibility with standard Express error fields
    Error.captureStackTrace(this, this.constructor);
  }
}
