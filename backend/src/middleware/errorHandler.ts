import { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors'
import { ZodError } from 'zod'
import { config } from '../config'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
      },
    })
    return
  }

  // Handle Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    const fields = (err as any).meta?.target || []
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `An instrument with this reference number and bank already exists in the regulatory registry.`,
        details: fields,
      },
    })
    return
  }

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request payload contains invalid fields',
        details: formatted,
      },
    })
    return
  }

  // Handle SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload provided in request body',
        details: [],
      },
    })
    return
  }

  // Internal Server Error
  const isProduction = config.NODE_ENV === 'production'
  const message = isProduction ? 'An unexpected server error occurred' : err.message

  console.error('[UNHANDLED_ERROR]', err)

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      details: isProduction ? [] : [err.stack],
    },
  })
}
