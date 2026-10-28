export interface ApiErrorPayload {
  status: number
  code: string
  message: string
  details?: Record<string, string[]>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, string[]>

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function parseError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError(500, 'CLIENT_ERROR', error.message)
  }

  return new ApiError(500, 'UNKNOWN_ERROR', 'An unexpected error occurred. Please try again.')
}
