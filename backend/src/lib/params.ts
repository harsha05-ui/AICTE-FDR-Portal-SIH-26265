import { Request } from 'express'
import { Prisma } from '@prisma/client'

/**
 * Safely extracts a string route parameter from Express 5 req.params
 * Express 5 can type req.params values as string | string[]
 */
export function param(req: Request, name: string): string {
  const val = req.params[name]
  if (Array.isArray(val)) {
    return val[0] || ''
  }
  return val || ''
}

/**
 * Alias for backward compatibility
 */
export const getRouteParam = param

/**
 * Serializes numeric, string, or Decimal values to string representation
 */
export function serializeAmount(val: number | string | Prisma.Decimal | null | undefined): string {
  if (val === null || val === undefined) return '0'
  return String(val)
}

export const serializeDecimal = serializeAmount
export const serializeDecimalOpt = (val: number | string | Prisma.Decimal | null | undefined) =>
  val === null || val === undefined ? undefined : String(val)

export function parseAmountToDecimal(val: number | string): Prisma.Decimal {
  return new Prisma.Decimal(val)
}

