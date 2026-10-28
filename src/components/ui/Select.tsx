import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  inputSize?: 'compact' | 'default' | 'comfortable'
  options?: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, inputSize = 'default', disabled, options, children, ...props }, ref) => {
    const sizeClasses = {
      compact: 'h-8 px-2.5 pr-8 text-xs',
      default: 'h-9 px-3 pr-9 text-xs',
      comfortable: 'h-10 px-3.5 pr-10 text-sm',
    }[inputSize]

    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-white text-slate-900 border rounded-lg transition-all duration-fast ease-spring cursor-pointer shadow-none',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-rose-300 focus:border-rose-600 focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none'
              : 'border-slate-200/90 hover:border-slate-300 focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:outline-none',
            sizeClasses,
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="absolute right-3 w-4 h-4 pointer-events-none text-slate-400" />
      </div>
    )
  }
)

Select.displayName = 'Select'
