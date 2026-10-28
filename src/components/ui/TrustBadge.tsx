import React from 'react'
import { FileText, UserCheck, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrustLevel } from '@/types'

export interface TrustBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level?: TrustLevel | string
  isSimulated?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md'
}

const LEVEL_CONFIG: Record<
  string,
  { label: string; dot: string; color: string; desc: string }
> = {
  SUBMITTED: {
    label: 'Submitted',
    dot: 'bg-slate-400',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'Record uploaded by institution; awaiting regulatory scrutiny.',
  },
  STAFF_VERIFIED: {
    label: 'Verified',
    dot: 'bg-blue-500',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    desc: 'Verified by AICTE Regional scrutiny desk against original deposit receipt.',
  },
  BANK_CONFIRMED: {
    label: 'Bank Confirmed',
    dot: 'bg-emerald-500',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    desc: 'Confirmed directly by core banking systems / SFMS.',
  },
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level = 'SUBMITTED',
  isSimulated = false,
  showTooltip = true,
  size = 'md',
  className,
  ...props
}) => {
  const normalizedLevel = (level || 'SUBMITTED').toUpperCase()
  const config = LEVEL_CONFIG[normalizedLevel] || LEVEL_CONFIG.SUBMITTED

  return (
    <span
      key={`${normalizedLevel}-${isSimulated}`}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-all duration-fast select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        isSimulated
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : config.color,
        className
      )}
      title={
        showTooltip
          ? `${config.label} — ${config.desc}${isSimulated ? ' (NOTE: Sandbox simulation test).' : ''}`
          : undefined
      }
      {...props}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSimulated ? 'bg-amber-500' : config.dot)} />
      <span className="tracking-tight">{config.label}</span>
      {isSimulated && (
        <span
          className="ml-0.5 inline-flex items-center px-1 py-0.2 text-[9px] font-medium bg-amber-200/80 text-amber-900 rounded-full"
          title="Sandbox Simulator Result"
        >
          SIM
        </span>
      )}
    </span>
  )
}
