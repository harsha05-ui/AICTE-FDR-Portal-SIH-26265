import React from 'react'
import { cn } from '@/lib/utils'
import { LienStatus } from '@/types'

export interface LienBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: LienStatus | string
  referenceNumber?: string
  size?: 'sm' | 'md'
}

const LIEN_CONFIG: Record<
  string,
  { label: string; dot: string; color: string; desc: string }
> = {
  NOT_MARKED: {
    label: 'No Lien',
    dot: 'bg-slate-400',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Instrument has not been lien-marked in favour of AICTE.',
  },
  MARKED: {
    label: 'Lien Claimed',
    dot: 'bg-blue-500',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    desc: 'Institution has claimed a lien in favour of AICTE; pending bank endorsement.',
  },
  CONFIRMED: {
    label: 'Lien Confirmed',
    dot: 'bg-emerald-500',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    desc: 'Lien formally endorsed and locked by issuing bank branch.',
  },
  RELEASED: {
    label: 'Lien Discharged',
    dot: 'bg-teal-500',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    desc: 'Lien released upon AICTE sanction order.',
  },
  INVOKED: {
    label: 'Lien Invoked',
    dot: 'bg-rose-500',
    color: 'bg-rose-50 text-rose-800 border-rose-200 font-medium',
    desc: 'Statutory encashment invoked due to regulatory non-compliance.',
  },
}

export const LienBadge: React.FC<LienBadgeProps> = ({
  status = 'NOT_MARKED',
  referenceNumber,
  size = 'md',
  className,
  ...props
}) => {
  const norm = (status || 'NOT_MARKED').toUpperCase()
  const config = LIEN_CONFIG[norm] || LIEN_CONFIG.NOT_MARKED

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors select-none text-[11px]',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5',
        config.color,
        className
      )}
      title={`${config.label} — ${config.desc}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`}
      {...props}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      <span>{config.label}</span>
      {referenceNumber && (
        <span className="font-mono text-[10px] text-slate-500">#{referenceNumber}</span>
      )}
    </span>
  )
}
