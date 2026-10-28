import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  inputSize?: 'compact' | 'default' | 'comfortable'
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error = false,
      inputSize = 'default',
      disabled,
      type = 'text',
      leftElement,
      rightElement,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const effectiveLeft = leftElement || leftIcon
    const effectiveRight = rightElement || rightIcon
    
    const sizeClasses = {
      compact: 'h-8 text-xs',
      default: 'h-9 text-xs',
      comfortable: 'h-10 text-sm',
    }[inputSize]

    const leftPadding = effectiveLeft ? 'pl-10' : inputSize === 'comfortable' ? 'pl-3.5' : 'pl-3'
    const rightPadding = effectiveRight ? 'pr-10' : inputSize === 'comfortable' ? 'pr-3.5' : 'pr-3'

    return (
      <div className="relative flex items-center w-full">
        {effectiveLeft && (
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400 select-none">
            {effectiveLeft}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={cn(
            'w-full bg-white text-slate-900 border rounded-lg transition-all duration-fast ease-spring shadow-none',
            'placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-rose-300 focus:border-rose-600 focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none'
              : 'border-slate-200/90 hover:border-slate-300 focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:outline-none',
            sizeClasses,
            leftPadding,
            rightPadding,
            className
          )}
          {...props}
        />
        {effectiveRight && (
          <div className="absolute right-3 flex items-center text-slate-400">
            {effectiveRight}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
