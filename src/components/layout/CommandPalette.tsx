import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  FileSpreadsheet,
  FileCheck2,
  Building2,
  RefreshCw,
  Unlock,
  ShieldAlert,
  Sliders,
  FileUp,
  FileBarChart,
  History,
  ScanText,
  Bell,
  ArrowRight,
  PlusCircle,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api-client'
import { FDRRecord, UserRole } from '@/types'
import { formatCurrency } from '@/lib/format'

interface CommandItem {
  id: string
  label: string
  subtext: string
  icon: React.ElementType
  to: string
  roles: UserRole[]
}

const ALL_COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtext: 'Central compliance metrics and priority queue',
    icon: LayoutDashboard,
    to: '/dashboard',
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'fdrs',
    label: 'FDR Instruments Registry',
    subtext: 'Browse and inspect security deposits and guarantees',
    icon: FileSpreadsheet,
    to: '/fdrs',
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'fdr-new',
    label: 'Register New Instrument',
    subtext: 'Submit new FDR or BG with statutory certificate',
    icon: PlusCircle,
    to: '/fdrs/new',
    roles: ['INSTITUTION_USER'],
  },
  {
    id: 'verification',
    label: 'Verification & Scrutiny Queue',
    subtext: 'Cross-verification matrix and SFMS bank check',
    icon: FileCheck2,
    to: '/verification',
    roles: ['REVIEWER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'institutions',
    label: 'Institution Profiles',
    subtext: 'Accredited institution directory and deposit history',
    icon: Building2,
    to: '/institutions',
    roles: ['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN', 'INSTITUTION_USER'],
  },
  {
    id: 'renewals',
    label: 'Renewals & Extensions',
    subtext: 'Maturity extensions and replacement petitions',
    icon: RefreshCw,
    to: '/renewals',
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'releases',
    label: 'Release & Sanction Orders',
    subtext: '5-office consensus ribbon and NOC issuance',
    icon: Unlock,
    to: '/releases',
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'holds',
    label: 'Regulatory Holds & Freezes',
    subtext: 'Legal injunctions and release block management',
    icon: ShieldAlert,
    to: '/holds',
    roles: ['APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'import',
    label: 'Bulk CSV Ingestion',
    subtext: 'Validate and import legacy instruments with dry-run',
    icon: FileUp,
    to: '/import',
    roles: ['ADMIN', 'AICTE_ADMIN'],
  },
  {
    id: 'settings',
    label: 'Statutory Policy Settings',
    subtext: 'Configure reminder thresholds, SLA limits, and banking adapters',
    icon: Sliders,
    to: '/settings',
    roles: ['ADMIN', 'AICTE_ADMIN'],
  },
  {
    id: 'audit',
    label: 'Regulatory Audit Log',
    subtext: 'Immutable history of official compliance actions',
    icon: History,
    to: '/audit',
    roles: ['ADMIN', 'AICTE_ADMIN'],
  },
  {
    id: 'reports',
    label: 'Reports & Data Export',
    subtext: 'Filtered regulatory datasets and CSV extraction',
    icon: FileBarChart,
    to: '/reports',
    roles: ['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
  {
    id: 'ocr',
    label: 'OCR Document Verification',
    subtext: 'Automated receipt text extraction and field matching',
    icon: ScanText,
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
    to: '/ocr',
  },
  {
    id: 'notifications',
    label: 'Notifications Inbox',
    subtext: 'Maturity notices, SLA warnings, and hold alerts',
    icon: Bell,
    to: '/notifications',
    roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
  },
]

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<FDRRecord[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const userRole = user?.role || 'INSTITUTION_USER'

  // Filter accessible commands
  const allowedCommands = React.useMemo(() => {
    return ALL_COMMAND_ITEMS.filter((item) => {
      if (item.roles.includes(userRole)) return true
      if (item.roles.includes('AICTE_OFFICIAL') && (userRole === 'REVIEWER' || userRole === 'APPROVER' || userRole === 'ADMIN')) return true
      if (item.roles.includes('AICTE_ADMIN') && userRole === 'ADMIN') return true
      return false
    })
  }, [userRole])

  // Filter commands by search term
  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return allowedCommands
    const q = query.toLowerCase()
    return allowedCommands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.subtext.toLowerCase().includes(q)
    )
  }, [allowedCommands, query])

  // Search instruments via API if query is at least 2 chars
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.fdrs.list({ search: query.trim() })
        setSearchResults(res.slice(0, 5))
      } catch (err) {
        console.error('Command palette search error:', err)
      } finally {
        setSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [open, query])

  // Reset query and focus on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Combined list for keyboard navigation
  const totalItems = filteredCommands.length + searchResults.length

  const handleSelect = (index: number) => {
    if (index < filteredCommands.length) {
      const cmd = filteredCommands[index]
      navigate(cmd.to)
      onClose()
    } else {
      const fdrIndex = index - filteredCommands.length
      const fdr = searchResults[fdrIndex]
      if (fdr) {
        navigate(`/fdrs/${fdr.id}`)
        onClose()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % Math.max(1, totalItems))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(activeIndex)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-navy-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-line rounded-xl shadow-level-3 overflow-hidden animate-in fade-in zoom-in-95 duration-fast"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-canvas/40">
          <Search className="w-5 h-5 text-ink-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            placeholder="Type a screen name or FDR reference number..."
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-ink-500 bg-surface border border-line rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Navigation Commands */}
          {filteredCommands.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-ink-400 uppercase tracking-wider font-mono">
                Permitted Navigation
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon
                  const isSelected = activeIndex === idx
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => handleSelect(idx)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <div className="truncate">
                          <span className="font-medium block truncate">{cmd.label}</span>
                          <span
                            className={`text-[10px] truncate block ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {cmd.subtext}
                          </span>
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FDR Instruments Search Section */}
          {query.trim().length >= 2 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-medium text-slate-400 tracking-wider flex items-center justify-between">
                <span>Matching FDR Instruments</span>
                {searching && <span className="text-slate-600 animate-pulse">Searching...</span>}
              </div>
              {searchResults.length === 0 && !searching ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">
                  No matching instruments found for &quot;{query}&quot;
                </div>
              ) : (
                <div className="space-y-0.5 mt-1">
                  {searchResults.map((fdr, fdrIdx) => {
                    const globalIdx = filteredCommands.length + fdrIdx
                    const isSelected = activeIndex === globalIdx
                    return (
                      <div
                        key={fdr.id}
                        onClick={() => handleSelect(globalIdx)}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText
                            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`}
                          />
                          <div className="truncate">
                            <span className="font-mono font-medium block truncate">
                              {fdr.fdrNumber || fdr.referenceNumber}
                            </span>
                            <span
                              className={`text-[10px] truncate block ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {fdr.institutionName} • {fdr.bankName}
                            </span>
                          </div>
                        </div>
                        <span className="tabular-nums font-semibold text-xs ml-2 shrink-0">
                          ₹{formatCurrency(Number(fdr.amount || fdr.depositAmount) || 0)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {filteredCommands.length === 0 && searchResults.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or records found for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Role:</span>
            <span className="font-medium text-slate-800 text-[11px] px-1.5 py-0.5 rounded bg-slate-200/70">
              {userRole}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
