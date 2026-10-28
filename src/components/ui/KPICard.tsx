import React, { useState, useEffect } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface KPICardProps {
  title: string
  value: number | string
  subtext?: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: () => void
  className?: string
  trend?: string
}

const STATUS_DOT_COLORS = {
  default: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  tone = 'default',
  onClick,
  className,
  trend,
}) => {
  const dotColor = STATUS_DOT_COLORS[tone] || STATUS_DOT_COLORS.default

  // Numeric count-up animation
  const [displayValue, setDisplayValue] = useState<number | string>(() => {
    return typeof value === 'number' ? 0 : value
  })

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value)
      return
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return
    }

    let start = 0
    const end = value
    const duration = 400
    const startTime = performance.now()

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * easeOut)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setDisplayValue(end)
      }
    }

    requestAnimationFrame(step)
  }, [value])

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'rounded-xl border border-slate-200/90 bg-white p-4 select-none relative group overflow-hidden transition-all duration-fast ease-spring',
        'shadow-level-1',
        onClick
          ? 'cursor-pointer hover:border-slate-300 hover:shadow-level-2 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1'
          : '',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
          <span className="text-xs font-medium text-slate-500 truncate">
            {title}
          </span>
        </div>

        {Icon && (
          <div className="w-6 h-6 rounded-md bg-slate-50 text-slate-400 group-hover:text-slate-700 flex items-center justify-center shrink-0 transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {displayValue}
        </div>
        {trend && (
          <span className="text-[11px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-normal">
          {subtext}
        </p>
      )}
    </div>
  )
}
