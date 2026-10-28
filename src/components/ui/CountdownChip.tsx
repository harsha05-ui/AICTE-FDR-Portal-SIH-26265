import React from 'react'
import { cn } from '@/lib/utils'

export interface CountdownChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  maturityDate?: string | Date
  daysLeft?: number
  size?: 'sm' | 'md'
}

export function computeDaysLeft(dateStr?: string | Date): number {
  if (!dateStr) return 0
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export const CountdownChip: React.FC<CountdownChipProps> = ({
  maturityDate,
  daysLeft: explicitDays,
  size = 'md',
  className,
  ...props
}) => {
  const days = explicitDays !== undefined ? explicitDays : computeDaysLeft(maturityDate)

  let label: string
  let color: string
  let dot: string

  if (days < 0) {
    label = `Matured (${Math.abs(days)}d ago)`
    color = 'bg-rose-50 text-rose-800 border-rose-200 font-medium'
    dot = 'bg-rose-500'
  } else if (days === 0) {
    label = 'Matures today'
    color = 'bg-rose-50 text-rose-800 border-rose-200 font-medium'
    dot = 'bg-rose-500'
  } else if (days < 15) {
    label = `${days}d left (critical)`
    color = 'bg-rose-50 text-rose-800 border-rose-200 font-medium'
    dot = 'bg-rose-500'
  } else if (days <= 60) {
    label = `${days}d left`
    color = 'bg-amber-50 text-amber-800 border-amber-200'
    dot = 'bg-amber-500'
  } else {
    label = `${days}d left`
    color = 'bg-slate-100 text-slate-700 border-slate-200'
    dot = 'bg-slate-400'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-colors select-none text-[11px] font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5',
        color,
        className
      )}
      title={maturityDate ? `Maturity Date: ${new Date(maturityDate).toLocaleDateString('en-IN')}` : undefined}
      {...props}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      <span className="tabular-nums tracking-tight">{label}</span>
    </span>
  )
}
