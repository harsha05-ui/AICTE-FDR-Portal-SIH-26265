import React, { forwardRef, useState, useEffect } from 'react'
import { parseINR } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number
  onChange?: (val: number) => void
  error?: boolean
  inputSize?: 'compact' | 'default' | 'comfortable'
  label?: string
  required?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, error, inputSize = 'default', disabled, className, label, required, ...props }, ref) => {
    const [displayVal, setDisplayVal] = useState<string>('')

    useEffect(() => {
      if (value !== undefined && value !== null && !isNaN(value)) {
        // Format with Indian grouping if not currently typing raw
        const parts = value.toString().split('.')
        const integerPart = parts[0]
        const lastThree = integerPart.slice(-3)
        const otherNumbers = integerPart.slice(0, -3)
        const formatted =
          otherNumbers !== ''
            ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
            : lastThree

        setDisplayVal(parts.length > 1 ? `${formatted}.${parts[1]}` : formatted)
      } else {
        setDisplayVal('')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Clean to allow numbers and decimal
      const cleaned = raw.replace(/[^0-9.]/g, '')
      const num = parseINR(cleaned)
      setDisplayVal(raw)
      onChange?.(num)
    }

    const sizeClasses = {
      compact: 'h-8 text-xs',
      default: 'h-9 text-sm',
      comfortable: 'h-10 text-sm',
    }[inputSize]

    const inputNode = (
      <div className="relative flex items-center w-full">
        <span className="absolute left-3 font-semibold text-ink-500 select-none pointer-events-none">
          ₹
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayVal}
          onChange={handleChange}
          className={cn(
            'w-full bg-surface text-ink-900 border rounded-sm pl-8 pr-3 transition-colors duration-fast ease-standard font-mono font-medium',
            'placeholder:text-ink-500/60 disabled:bg-canvas disabled:text-ink-500 disabled:cursor-not-allowed',
            error
              ? 'border-danger focus:border-danger focus-visible:outline-danger'
              : 'border-line hover:border-ink-500/40 focus:border-navy-900 focus-visible:outline-navy-900',
            sizeClasses,
            className
          )}
          {...props}
        />
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

CurrencyInput.displayName = 'CurrencyInput'
