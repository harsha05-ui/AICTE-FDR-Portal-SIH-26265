import React from 'react'

interface AicteLogoProps {
  className?: string
  size?: number
  variant?: 'emblem' | 'full' | 'compact'
  subtext?: string
}

export const AicteLogo: React.FC<AicteLogoProps> = ({
  className = '',
  size = 48,
  variant = 'emblem',
  subtext,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Official AICTE Emblem Logo with contrast frame */}
      <div className="shrink-0 p-0.5 rounded-xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-slate-300 shadow-sm flex items-center justify-center">
        <img
          src="/aicte-logo.png"
          alt="All India Council for Technical Education"
          width={size}
          height={size}
          className="object-contain drop-shadow-sm rounded-sm"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col text-left leading-tight min-w-0">
          <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
            All India Council for Technical Education
          </span>
          <span className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
            {subtext || 'Ministry of Education · Govt. of India'}
          </span>
        </div>
      )}

      {variant === 'compact' && (
        <div className="flex flex-col text-left leading-tight min-w-0">
          <span className="text-sm font-bold text-slate-900 tracking-tight truncate">
            AICTE
          </span>
          <span className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {subtext || 'All India Council for Technical Education'}
          </span>
        </div>
      )}
    </div>
  )
}

