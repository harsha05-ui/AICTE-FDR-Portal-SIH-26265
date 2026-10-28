export class AppError extends Error {
  public statusCode: number
  public code: string
  public details?: unknown[]

  constructor(statusCode: number, code: string, message: string, details?: unknown[]) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown[], code = 'VALIDATION_ERROR') {
    super(400, code, message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions', code = 'FORBIDDEN') {
    super(403, code, message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(409, code, message)
  }
}
