import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  statusFilter?: string
  onStatusChange?: (status: string) => void
  statusOptions?: FilterOption[]
  bankFilter?: string
  onBankChange?: (bank: string) => void
  bankOptions?: FilterOption[]
  onReset?: () => void
  className?: string
  extraFilters?: React.ReactNode
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search by FDR number, institution or bank...',
  statusFilter,
  onStatusChange,
  statusOptions,
  bankFilter,
  onBankChange,
  bankOptions,
  onReset,
  className,
  extraFilters,
}) => {
  const hasActiveFilters = Boolean(
    searchQuery || (statusFilter && statusFilter !== 'all') || (bankFilter && bankFilter !== 'all')
  )

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 bg-surface border border-line rounded-md shadow-level-1',
        className
      )}
    >
      <div className="flex-1 min-w-[240px]">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          leftElement={<Search className="w-4 h-4 text-ink-500" />}
          inputSize="default"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {statusOptions && onStatusChange && (
          <div className="min-w-[150px]">
            <Select
              value={statusFilter || 'all'}
              onChange={(e) => onStatusChange(e.target.value)}
              inputSize="default"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {bankOptions && onBankChange && (
          <div className="min-w-[150px]">
            <Select
              value={bankFilter || 'all'}
              onChange={(e) => onBankChange(e.target.value)}
              inputSize="default"
              aria-label="Filter by bank"
            >
              <option value="all">All Banks</option>
              {bankOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {extraFilters}

        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="default"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onReset}
            className="text-xs"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
