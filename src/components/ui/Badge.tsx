import React from 'react'
import {
  FileEdit,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRightLeft,
  Unlock,
  Archive,
  CircleDashed,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Send,
  Eye,
  CheckCheck,
  XOctagon,
  Shield,
  Building,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusValue = string

interface StatusConfig {
  icon?: LucideIcon
  label: string
  dotClass: string
  colorClass: string
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // Lifecycle
  DRAFT: { label: 'Draft', dotClass: 'bg-slate-400', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  Draft: { label: 'Draft', dotClass: 'bg-slate-400', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  ACTIVE: { label: 'Active', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  Active: { label: 'Active', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  EXPIRING: { label: 'Expiring Soon', dotClass: 'bg-amber-500', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  'Maturing soon': { label: 'Expiring Soon', dotClass: 'bg-amber-500', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  MATURED: { label: 'Matured / Overdue', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  Matured: { label: 'Matured / Overdue', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  RENEWED: { label: 'Renewed', dotClass: 'bg-blue-500', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  Renewed: { label: 'Renewed', dotClass: 'bg-blue-500', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  REPLACED: { label: 'Replaced', dotClass: 'bg-indigo-500', colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  Replaced: { label: 'Replaced', dotClass: 'bg-indigo-500', colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  RELEASED: { label: 'Released', dotClass: 'bg-teal-500', colorClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  Released: { label: 'Released', dotClass: 'bg-teal-500', colorClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  CLOSED: { label: 'Closed', dotClass: 'bg-slate-400', colorClass: 'bg-slate-100 text-slate-600 border-slate-200' },

  // Verification
  NOT_SUBMITTED: { label: 'Not Submitted', dotClass: 'bg-slate-400', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  'Not submitted': { label: 'Not Submitted', dotClass: 'bg-slate-400', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUBMITTED: { label: 'Submitted', dotClass: 'bg-blue-500', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  'Pending review': { label: 'Pending Review', dotClass: 'bg-blue-500', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  UNDER_REVIEW: { label: 'Under Review', dotClass: 'bg-amber-500', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  'Under review': { label: 'Under Review', dotClass: 'bg-amber-500', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  VERIFIED: { label: 'Verified', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  Verified: { label: 'Verified', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  DISCREPANCY: { label: 'Discrepancy Flagged', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  'Discrepancy flagged': { label: 'Discrepancy Flagged', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  CORRECTION_REQUESTED: { label: 'Correction Requested', dotClass: 'bg-orange-500', colorClass: 'bg-orange-50 text-orange-800 border-orange-200' },
  REJECTED: { label: 'Rejected', dotClass: 'bg-rose-600', colorClass: 'bg-rose-100 text-rose-900 border-rose-300' },
  Rejected: { label: 'Rejected', dotClass: 'bg-rose-600', colorClass: 'bg-rose-100 text-rose-900 border-rose-300' },

  // Requests
  Submitted: { label: 'Submitted', dotClass: 'bg-blue-500', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  Approved: { label: 'Approved', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  APPROVED: { label: 'Approved', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  Declined: { label: 'Declined', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  DECLINED: { label: 'Declined', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  Completed: { label: 'Completed', dotClass: 'bg-teal-500', colorClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  COMPLETED: { label: 'Completed', dotClass: 'bg-teal-500', colorClass: 'bg-teal-50 text-teal-800 border-teal-200' },

  // Risk Levels
  LOW: { label: 'Low Risk', dotClass: 'bg-emerald-500', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  MEDIUM: { label: 'Medium Risk', dotClass: 'bg-amber-500', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  HIGH: { label: 'High Risk', dotClass: 'bg-rose-500', colorClass: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold' },

  // Instrument Types
  FDR: { label: 'FDR Deposit', dotClass: 'bg-slate-700', colorClass: 'bg-slate-100 text-slate-800 border-slate-200' },
  SECURITY_DEPOSIT: { label: 'Security Deposit', dotClass: 'bg-slate-700', colorClass: 'bg-slate-100 text-slate-800 border-slate-200' },
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string
  icon?: LucideIcon
  variant?: 'subtle' | 'outline' | 'neutral'
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  icon: CustomIcon,
  className,
  children,
  ...props
}) => {
  const config = status ? STATUS_CONFIGS[status] : undefined
  const Icon = CustomIcon || config?.icon
  const dotClass = config?.dotClass || 'bg-slate-400'
  const colorClass = config?.colorClass || 'bg-slate-50 text-slate-700 border-slate-200'
  const displayLabel = children || config?.label || status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border whitespace-nowrap',
        colorClass,
        className
      )}
      {...props}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotClass)} aria-hidden="true" />
      {Icon && <Icon className="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" />}
      <span>{displayLabel}</span>
    </span>
  )
}

export const RiskBadge: React.FC<{ level?: string; className?: string }> = ({
  level = 'LOW',
  className,
}) => {
  return <Badge status={(level || 'LOW').toUpperCase()} className={className} />
}

export const InstrumentTypeBadge: React.FC<{ type?: string; className?: string }> = ({
  type = 'FDR',
  className,
}) => {
  const norm = type === 'SECURITY_DEPOSIT' ? 'SECURITY_DEPOSIT' : 'FDR'
  return <Badge status={norm} className={className} />
}

export const InstrumentSourceBadge: React.FC<{
  source?: string
  verificationStatus?: string
  className?: string
}> = ({ source, verificationStatus, className }) => {
  let label = 'Institution-submitted'
  let color = 'bg-slate-100 text-slate-700 border-slate-200'
  let dot = 'bg-slate-400'

  if (source === 'SFMS_CORE_BANKING' || source === 'DIRECT_BANK_API' || source === 'Bank-confirmed') {
    label = 'Bank-confirmed (SFMS)'
    color = 'bg-emerald-50 text-emerald-800 border-emerald-200'
    dot = 'bg-emerald-500'
  } else if (
    source === 'MANUAL_REVIEW' ||
    verificationStatus === 'VERIFIED' ||
    verificationStatus === 'DISCREPANCY' ||
    verificationStatus === 'REJECTED'
  ) {
    label = 'Manually reviewed'
    color = 'bg-amber-50 text-amber-800 border-amber-200'
    dot = 'bg-amber-500'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border',
        color,
        className
      )}
      title="Statutory verification source trail"
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      <span>{label}</span>
    </span>
  )
}
