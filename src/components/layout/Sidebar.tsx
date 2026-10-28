import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileCheck2,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Unlock,
  FileBarChart,
  History,
  ScanText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sliders,
  FileUp,
  ShieldAlert,
} from 'lucide-react'
import { AicteLogo } from '@/components/common/AicteLogo'
import { UserRole } from '@/types'
import { cn } from '@/lib/utils'

export interface SidebarProps {
  role: UserRole
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  badge?: number
  roles: UserRole[]
}

function getItemLabel(item: NavItem, role: UserRole): string {
  if (role === 'INSTITUTION_USER') {
    if (item.to === '/fdrs') return 'My Instruments'
    if (item.to === '/renewals') return 'Renewal Petitions'
    if (item.to === '/releases') return 'Release Requests'
  } else if (role === 'REVIEWER') {
    if (item.to === '/verification') return 'Work Queue'
    if (item.to === '/institutions') return 'Institution Profiles'
    if (item.to === '/releases') return 'Release Stage Review'
  } else if (role === 'APPROVER') {
    if (item.to === '/renewals') return 'Decision Queue'
    if (item.to === '/releases') return 'Order Download & Release'
  } else if (role === 'ADMIN' || role === 'AICTE_ADMIN') {
    if (item.to === '/import') return 'CSV Bulk Import'
    if (item.to === '/settings') return 'System Settings'
    if (item.to === '/audit') return 'Audit Log'
  }
  return item.label
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Core Compliance',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'Verification Queue',
        to: '/verification',
        icon: FileCheck2,
        roles: ['REVIEWER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'FDR Instruments',
        to: '/fdrs',
        icon: FileSpreadsheet,
        roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'Institutions',
        to: '/institutions',
        icon: Building2,
        roles: ['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
    ],
  },
  {
    group: 'Lifecycle Operations',
    items: [
      {
        label: 'Renewals & Transfer',
        to: '/renewals',
        icon: RefreshCw,
        roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'Release & Refund',
        to: '/releases',
        icon: Unlock,
        roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'OCR Verification',
        to: '/ocr',
        icon: ScanText,
        roles: ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'Bulk Ingestion',
        to: '/import',
        icon: FileUp,
        roles: ['ADMIN', 'AICTE_ADMIN'],
      },
      {
        label: 'Regulatory Holds',
        to: '/holds',
        icon: ShieldAlert,
        roles: ['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
    ],
  },
  {
    group: 'Oversight & Audit',
    items: [
      {
        label: 'Reports & Export',
        to: '/reports',
        icon: FileBarChart,
        roles: ['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN'],
      },
      {
        label: 'Regulatory Audit',
        to: '/audit',
        icon: History,
        roles: ['ADMIN', 'AICTE_ADMIN'],
      },
      {
        label: 'Statutory Settings',
        to: '/settings',
        icon: Sliders,
        roles: ['ADMIN', 'AICTE_ADMIN'],
      },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const content = (
    <div
      className={cn(
        'h-full flex flex-col bg-white border-r border-slate-200 transition-all duration-base ease-spring z-40 select-none',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Organisation Mark */}
      <div className="flex items-center justify-between px-3.5 h-16 border-b border-slate-100">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <AicteLogo size={collapsed ? 30 : 36} />
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-[11.5px] font-bold text-[#0B4F8A] tracking-tight leading-tight line-clamp-2" title="All India Council for Technical Education">
                All India Council for Technical Education
              </span>
              <span className="block text-[10px] text-slate-500 font-medium truncate mt-0.5">
                सुरक्षाकोष · Security Deposit & FDR Portal
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.roles.includes(role)) return true
            if (item.roles.includes('AICTE_OFFICIAL') && (role === 'REVIEWER' || role === 'APPROVER' || role === 'ADMIN')) return true
            if (item.roles.includes('AICTE_ADMIN') && role === 'ADMIN') return true
            return false
          })
          if (visibleItems.length === 0) return null

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[11px] font-medium text-slate-400">
                  {group.group}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon
                const displayLabel = getItemLabel(item, role)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-fast',
                        isActive
                          ? 'bg-slate-900 text-white font-medium shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      )
                    }
                    title={collapsed ? displayLabel : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                        {!collapsed && <span className="truncate">{displayLabel}</span>}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Clean Footer Notice */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-medium text-slate-800 mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>AICTE Compliance Portal</span>
          </div>
          <p className="text-[10px] text-slate-400">Statutory Deposit Registry</p>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 h-full">{content}</aside>

      {/* Mobile Off-canvas Sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 h-full shadow-level-3">{content}</div>
        </div>
      )}
    </>
  )
}
