import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const KNOWN_DEMO_SECRET_MARKERS = [
  'dev_demo_key',
  '0123456789abcdef',
  'change_in_production',
  'aicte_secure_cookie_secret_2026',
  'aicte_statutory_portal_refresh_secret_2026',
]

export function validateProductionSecrets(env: Record<string, string | undefined>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  const checkSecret = (key: string, minLength = 32) => {
    const val = env[key]
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      errors.push(`Production requires '${key}' to be set.`)
      return
    }
    if (val.length < minLength) {
      errors.push(`Production '${key}' must be at least ${minLength} characters long.`)
    }
    if (KNOWN_DEMO_SECRET_MARKERS.some((marker) => val.includes(marker))) {
      errors.push(`Production '${key}' cannot use known demo/default value (${val.slice(0, 8)}...).`)
    }
  }

  checkSecret('JWT_SECRET')
  checkSecret('JWT_REFRESH_SECRET')
  checkSecret('SESSION_COOKIE_SECRET')
  checkSecret('FILE_ENC_KEY', 32)

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const configSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().default('aicte_statutory_portal_refresh_secret_2026'),
  SESSION_COOKIE_SECRET: z.string().default('aicte_secure_cookie_secret_2026'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('8h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  FILE_ENC_KEY: z.string().min(32, 'FILE_ENC_KEY must be at least 32 characters'),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

if (parsed.data.NODE_ENV === 'production') {
  const prodCheck = validateProductionSecrets(process.env)
  if (!prodCheck.isValid) {
    console.error('FATAL: Production mode secret validation failed:')
    for (const err of prodCheck.errors) {
      console.error(` - ${err}`)
    }
    process.exit(1)
  }
}

export const config = parsed.data

