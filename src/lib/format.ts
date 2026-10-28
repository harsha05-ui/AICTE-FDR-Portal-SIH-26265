/**
 * Centralized formatting helpers per PRD Section 6 & 11
 * Enforces strict Indian digit grouping for INR (e.g., 12,50,000.00)
 * and unified date formatting (e.g., 23 Oct 2026).
 */

export function formatINR(amount: number | string | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined) {
    return includeSymbol ? '₹ 0.00' : '0.00'
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount)) {
    return includeSymbol ? '₹ 0.00' : '0.00'
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const formatted = formatter.format(numericAmount)
  return includeSymbol ? `₹ ${formatted}` : formatted
}

export const formatCurrency = formatINR

export function parseINR(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function formatDate(input: string | number | Date | null | undefined): string {
  if (!input) return '—'
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return '—'
  const date = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
