import React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  breadcrumbs?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  breadcrumbs,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 mb-5',
        className
      )}
    >
      <div>
        {breadcrumbs && <div className="mb-1.5">{breadcrumbs}</div>}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs text-slate-500 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-2.5 shrink-0">{action}</div>}
    </div>
  )
}
