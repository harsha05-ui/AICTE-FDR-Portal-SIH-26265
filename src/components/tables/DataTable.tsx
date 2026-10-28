import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, AlignJustify, List, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  className?: string
  width?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  isLoading?: boolean
  emptyMessage?: string
  showDensityToggle?: boolean
  renderExpandedRow?: (item: T) => React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No records match the current filter criteria.',
  showDensityToggle = true,
  renderExpandedRow,
}: DataTableProps<T>) {
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())

  const handleSort = (key?: keyof T) => {
    if (!key) return
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleRowExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1
      const comparison = valA < valB ? -1 : 1
      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDir])

  const rowHeightClass = density === 'compact' ? 'h-10 py-2' : 'h-13 py-3'

  return (
    <div className="w-full flex flex-col bg-white border border-slate-200/90 rounded-xl shadow-level-1 overflow-hidden select-none">
      {/* Table toolbar / density toggle */}
      {showDensityToggle && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Showing {data.length} records</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Density:</span>
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={cn(
                'p-1 rounded-md transition-colors',
                density === 'compact' ? 'bg-slate-900 text-white' : 'hover:bg-slate-200/60 text-slate-600'
              )}
              title="Compact density"
              aria-label="Compact row density"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDensity('comfortable')}
              className={cn(
                'p-1 rounded-md transition-colors',
                density === 'comfortable' ? 'bg-slate-900 text-white' : 'hover:bg-slate-200/60 text-slate-600'
              )}
              title="Comfortable density"
              aria-label="Comfortable row density"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table container: SOLID SURFACE with STICKY HEADER */}
      <div className="overflow-x-auto max-h-[680px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-none">
            <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              {renderExpandedRow && <th className="w-8 px-2 py-2.5" />}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-2.5 text-[11px]',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer hover:bg-slate-100/80 transition-colors',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  aria-sort={
                    sortKey === col.accessorKey
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end w-full',
                      col.align === 'center' && 'justify-center w-full'
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.accessorKey ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="h-10">
                  {renderExpandedRow && <td className="px-2 py-2" />}
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-2">
                      <div className="h-4 bg-slate-100 rounded-md animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (renderExpandedRow ? 1 : 0)} className="px-4 py-10 text-center text-xs text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item) => {
                const id = keyExtractor(item)
                const isExpanded = expandedRowIds.has(id)

                return (
                  <React.Fragment key={id}>
                    <tr
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'transition-colors duration-fast hover:bg-slate-50/90',
                        onRowClick && 'cursor-pointer',
                        isExpanded && 'bg-slate-50/60',
                        rowHeightClass
                      )}
                    >
                      {renderExpandedRow && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => toggleRowExpanded(id, e)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-transform"
                            aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-900" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col, cIdx) => {
                        const content = col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? String(item[col.accessorKey] ?? '')
                          : null

                        return (
                          <td
                            key={cIdx}
                            className={cn(
                              'px-4 text-xs text-slate-800',
                              col.align === 'right' && 'text-right tabular-nums font-medium',
                              col.align === 'center' && 'text-center',
                              col.className
                            )}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                    {isExpanded && renderExpandedRow && (
                      <tr className="bg-slate-50/50 border-b border-slate-100 fade-in-settle">
                        <td colSpan={columns.length + 1} className="p-4">
                          {renderExpandedRow(item)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
