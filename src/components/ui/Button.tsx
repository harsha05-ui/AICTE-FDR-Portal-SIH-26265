import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'compact' | 'default' | 'comfortable'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      loading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      compact: 'h-8 px-3 text-xs gap-1.5',
      default: 'h-9 px-3.5 text-xs gap-2',
      comfortable: 'h-10 px-4 text-sm gap-2.5',
    }[size]

    const variantClasses = {
      primary:
        'bg-slate-900 hover:bg-slate-800 active:bg-black text-white shadow-sm border border-slate-900 disabled:bg-slate-400 disabled:border-slate-400',
      secondary:
        'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-sm disabled:bg-slate-50 disabled:text-slate-400',
      outline:
        'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-sm disabled:bg-slate-50 disabled:text-slate-400',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200/80 text-slate-600 hover:text-slate-900 disabled:text-slate-400',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-600 disabled:bg-rose-300',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-600 disabled:bg-emerald-300',
    }[variant]

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg cursor-pointer select-none',
          'transition-all duration-fast ease-spring active:scale-[0.985]',
          'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-60',
          sizeClasses,
          variantClasses,
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
