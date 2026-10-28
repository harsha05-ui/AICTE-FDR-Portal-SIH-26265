import React from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Building2,
  ShieldCheck,
  Scale,
  FileCheck2,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OfficeRole, ReleaseStage } from '@/types'

export interface StageTrackerProps {
  stages?: ReleaseStage[]
  currentStageOffice?: OfficeRole | string
  onSelectStage?: (stage: ReleaseStage) => void
  selectedStageId?: string
  className?: string
}

const OFFICE_METADATA: Record<
  OfficeRole,
  { label: string; short: string; icon: React.ElementType; defaultSlaDays: number }
> = {
  REGIONAL_OFFICE: {
    label: 'Regional Office',
    short: 'Inspection & compliance',
    icon: Building2,
    defaultSlaDays: 7,
  },
  APPROVAL_BUREAU: {
    label: 'Approval Bureau',
    short: 'Bureau concurrence',
    icon: FileCheck2,
    defaultSlaDays: 5,
  },
  GRIEVANCE_CELL: {
    label: 'Grievance Cell',
    short: 'Grievance clearance',
    icon: Scale,
    defaultSlaDays: 5,
  },
  VIGILANCE_CELL: {
    label: 'Vigilance Cell',
    short: 'Disciplinary check',
    icon: ShieldCheck,
    defaultSlaDays: 7,
  },
  COMPETENT_AUTHORITY: {
    label: 'Competent Authority',
    short: 'Sanction order',
    icon: Award,
    defaultSlaDays: 3,
  },
}

const ORDERED_OFFICES: OfficeRole[] = [
  'REGIONAL_OFFICE',
  'APPROVAL_BUREAU',
  'GRIEVANCE_CELL',
  'VIGILANCE_CELL',
  'COMPETENT_AUTHORITY',
]

export const StageTracker: React.FC<StageTrackerProps> = ({
  stages = [],
  currentStageOffice,
  onSelectStage,
  selectedStageId,
  className,
}) => {
  const stageMap = React.useMemo(() => {
    const map = new Map<OfficeRole, ReleaseStage>()
    stages.forEach((s) => map.set(s.office, s))
    return map
  }, [stages])

  const currentOfficeIndex = currentStageOffice
    ? ORDERED_OFFICES.indexOf(currentStageOffice as OfficeRole)
    : -1

  return (
    <div
      className={cn(
        'bg-surface rounded-lg p-4 border border-line shadow-level-1 relative overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
        <div>
          <h4 className="text-xs font-semibold text-ink-900 tracking-tight flex items-center gap-2">
            <span>Multi-office release pipeline</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-canvas text-ink-700 border border-line">
              5 desks
            </span>
          </h4>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Sequential consensus workflow with SLA tracking and audit remarks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 relative">
        {ORDERED_OFFICES.map((office, idx) => {
          const meta = OFFICE_METADATA[office]
          const stage = stageMap.get(office)
          const OfficeIcon = meta.icon

          // Status calculation
          const isCurrent =
            currentStageOffice === office ||
            (!currentStageOffice && idx === 0 && !stage?.status) ||
            stage?.status === 'IN_REVIEW'
          const isApproved = stage?.status === 'APPROVED' || (currentOfficeIndex > idx && !stage?.status)
          const isRejected = stage?.status === 'REJECTED'
          const isReturned = stage?.status === 'RETURNED'
          const isPending = !isCurrent && !isApproved && !isRejected && !isReturned
          const isSelected = selectedStageId && stage?.id === selectedStageId

          const nowMs = Date.now()
          const rawDueDate = stage?.slaDueDate || (stage as any)?.dueAt
          const dueMs = rawDueDate ? new Date(rawDueDate).getTime() : 0
          const enteredMs = stage?.enteredAt
            ? new Date(stage.enteredAt).getTime()
            : dueMs
            ? dueMs - meta.defaultSlaDays * 86400000
            : 0
          const elapsedDays = enteredMs ? Math.max(0, Math.floor((nowMs - enteredMs) / 86400000)) : 0
          const isOverdue = stage?.isOverdue || (dueMs > 0 && nowMs > dueMs)
          const hoursRemaining = dueMs > 0 ? Math.round((dueMs - nowMs) / 3600000) : null
          const isAmberWarning = !isOverdue && hoursRemaining !== null && hoursRemaining <= 48

          let statusBadge = 'Pending'
          let StatusIcon = Clock
          let statusBadgeClass = 'bg-canvas text-ink-500 border-line'

          if (isApproved) {
            statusBadge = 'Approved'
            StatusIcon = CheckCircle2
            statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200'
          } else if (isCurrent) {
            if (isOverdue) {
              statusBadge = 'Overdue'
              StatusIcon = AlertTriangle
              statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200'
            } else if (isAmberWarning) {
              statusBadge = 'Warning'
              StatusIcon = AlertTriangle
              statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
            } else {
              statusBadge = 'In review'
              StatusIcon = Clock
              statusBadgeClass = 'bg-accent-subtle text-accent-primary border-accent-primary/30'
            }
          } else if (isRejected) {
            statusBadge = 'Rejected'
            StatusIcon = XCircle
            statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200'
          } else if (isReturned) {
            statusBadge = 'Returned'
            StatusIcon = RotateCcw
            statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
          }

          return (
            <div
              key={office}
              onClick={() => stage && onSelectStage?.(stage)}
              className={cn(
                'relative p-3 rounded-md border transition-all text-xs select-none bg-surface',
                isCurrent ? 'border-ink-900 shadow-sm' : 'border-line',
                onSelectStage && stage ? 'cursor-pointer hover:border-ink-500' : '',
                isSelected ? 'ring-1 ring-ink-900' : ''
              )}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] mb-2 font-mono">
                <span className="font-medium text-ink-500 tabular-nums">0{idx + 1}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium border inline-flex items-center gap-1',
                    statusBadgeClass
                  )}
                >
                  <StatusIcon className="w-2.5 h-2.5 shrink-0" />
                  <span>{statusBadge}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs',
                    isCurrent ? 'bg-ink-900 text-white' : 'bg-canvas text-ink-700 border border-line'
                  )}
                >
                  <OfficeIcon className="w-3 h-3" />
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-xs font-medium text-ink-900 truncate">
                    {meta.label}
                  </div>
                  <div className="text-[10px] text-ink-500 truncate">{meta.short}</div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-line text-[11px] font-mono text-ink-500 flex items-center justify-between tabular-nums">
                <span className="flex items-center gap-1">
                  <span>
                    {isCurrent ? `At desk: ${elapsedDays}d` : `SLA: ${meta.defaultSlaDays}d`}
                  </span>
                </span>
                {stage?.actorName && (
                  <span className="truncate max-w-[80px]" title={stage.actorName}>
                    {stage.actorName.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
