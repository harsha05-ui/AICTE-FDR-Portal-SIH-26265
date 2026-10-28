import { Request, Response, NextFunction } from 'express'

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'authorization']

function maskSensitiveData(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData)
  }

  const masked: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      masked[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      masked[key] = maskSensitiveData(val)
    } else {
      masked[key] = val
    }
  }
  return masked
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  const { method, originalUrl, ip } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode

    // Mask sensitive parameters for logging
    const safeBody = req.body ? maskSensitiveData(req.body) : undefined

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${status} ${duration}ms - IP: ${ip} ${
        safeBody && Object.keys(safeBody).length > 0 ? `Body: ${JSON.stringify(safeBody)}` : ''
      }`
    )
  })

  next()
}
