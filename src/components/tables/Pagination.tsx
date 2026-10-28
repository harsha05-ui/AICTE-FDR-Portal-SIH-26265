import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-surface border-t border-line text-xs text-ink-700',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="font-semibold text-ink-900">{startItem}</strong> to{' '}
          <strong className="font-semibold text-ink-900">{endItem}</strong> of{' '}
          <strong className="font-semibold text-ink-900">{totalItems}</strong> entries
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 bg-canvas border border-line rounded-sm px-2 py-1 text-xs"
            aria-label="Records per page"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="compact"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="px-2 py-1 font-mono text-xs text-ink-700">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="compact"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
