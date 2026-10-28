import React from 'react'
import { cn } from '@/lib/utils'

export interface FieldProps {
  id?: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}) => {
  const errorId = id ? `${id}-error` : undefined
  const hintId = id ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-ink-700">
          {label}
          {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
        </label>
        {hint && !error && (
          <span id={hintId} className="text-xs text-ink-500">
            {hint}
          </span>
        )}
      </div>

      <div>{children}</div>

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-medium text-danger animate-fadeIn"
        >
          {error}
        </span>
      )}
    </div>
  )
}
