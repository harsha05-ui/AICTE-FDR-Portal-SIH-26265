import React, { forwardRef } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  inputSize?: 'compact' | 'default' | 'comfortable'
  label?: string
  required?: boolean
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, error, inputSize = 'default', disabled, label, required, ...props }, ref) => {
    const sizeClasses = {
      compact: 'h-8 px-2.5 text-xs',
      default: 'h-9 px-3 text-sm',
      comfortable: 'h-10 px-3.5 text-sm',
    }[inputSize]

    const inputNode = (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="date"
          disabled={disabled}
          className={cn(
            'w-full bg-surface text-ink-900 border rounded-sm transition-colors duration-fast ease-standard cursor-pointer',
            'disabled:bg-canvas disabled:text-ink-500 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger focus-visible:outline-danger'
              : 'border-line hover:border-ink-500/40 focus:border-navy-900 focus-visible:outline-navy-900',
            sizeClasses,
            className
          )}
          {...props}
        />
        <Calendar className="absolute right-3 w-4 h-4 pointer-events-none text-ink-500" />
      </div>
    )

    if (label) {
      return (
        <div className="space-y-1 w-full">
          <label className="block text-xs font-semibold text-ink-900">
            {label} {required && <span className="text-danger">*</span>}
          </label>
          {inputNode}
        </div>
      )
    }

    return inputNode
  }
)

DateField.displayName = 'DateField'
