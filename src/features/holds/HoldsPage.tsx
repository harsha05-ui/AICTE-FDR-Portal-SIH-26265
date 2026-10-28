import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Lock,
  Unlock,
  AlertTriangle,
  Search,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/forms/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatDate } from '@/lib/format'
import { HoldRecord } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'
import { cn } from '@/lib/utils'

export const HoldsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CLEARED'>('ACTIVE')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [selectedHold, setSelectedHold] = useState<HoldRecord | null>(null)

  // Form states
  const [targetInstId, setTargetInstId] = useState('')
  const [reason, setReason] = useState('')
  const [sourceBody, setSourceBody] = useState('VIGILANCE_CELL')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [clearRemarks, setClearRemarks] = useState('')
  const [clearRefNumber, setClearRefNumber] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: holds = [], isLoading } = useQuery({
    queryKey: ['holds'],
    queryFn: () => api.holds.list(),
  })

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  React.useEffect(() => {
    if (!targetInstId && institutions.length > 0) {
      setTargetInstId(institutions[0].id)
    }
  }, [institutions, targetInstId])

  const createHoldMutation = useMutation({
    mutationFn: (data: { institutionId: string; reason: string; sourceBody: string; referenceNumber?: string }) =>
      api.institutions.createHold(data.institutionId, {
        reason: data.reason,
        sourceBody: data.sourceBody,
        referenceNumber: data.referenceNumber,
      }),
    onSuccess: (hold) => {
      queryClient.invalidateQueries({ queryKey: ['holds'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      setCreateModalOpen(false)
      setReason('')
      setReferenceNumber('')
      toast({
        title: 'Regulatory hold imposed',
        description: `Active hold placed by ${hold.sourceBody}. Deposit releases frozen for this institution.`,
        type: 'warning',
      })
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to place regulatory hold.')
    },
  })

  const clearHoldMutation = useMutation({
    mutationFn: (data: { holdId: string; remarks: string; referenceNumber?: string }) =>
      api.holds.clear(data.holdId, {
        remarks: data.remarks,
        referenceNumber: data.referenceNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      setClearModalOpen(false)
      setClearRemarks('')
      setClearRefNumber('')
      toast({
        title: 'Regulatory hold cleared',
        description: 'Clearance recorded in audit trail. Release freeze lifted.',
        type: 'success',
      })
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to clear regulatory hold.')
    },
  })

  const isApproverOrAdmin = user?.role === 'APPROVER' || user?.role === 'ADMIN'

  const isHoldActive = (h: HoldRecord) => h.status === 'ACTIVE' || (h as any).active === true

  const filteredHolds = holds.filter((h) => {
    if (statusFilter === 'ACTIVE' && !isHoldActive(h)) return false
    if (statusFilter === 'CLEARED' && isHoldActive(h)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchInst = (h.institutionName || '').toLowerCase().includes(q)
      const matchReason = (h.reason || '').toLowerCase().includes(q)
      const matchSrc = (h.sourceBody || '').toLowerCase().includes(q)
      if (!matchInst && !matchReason && !matchSrc) return false
    }
    return true
  })

  const columns: Column<HoldRecord>[] = [
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <div>
          <span className="font-medium text-ink-900 block text-xs">
            {item.institutionName || item.institutionId}
          </span>
          <span className="text-[11px] text-ink-500">
            Placed by: {item.placedBy || 'Regulatory Officer'}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Source authority',
      accessorKey: 'sourceBody',
      cell: (item) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-canvas text-ink-900 font-medium border border-line">
          {item.sourceBody}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Grounds & reason',
      accessorKey: 'reason',
      cell: (item) => (
        <div className="max-w-md">
          <p className="text-xs text-ink-900 leading-snug">{item.reason}</p>
          {(item.referenceNumber || (item as any).referenceNo) && (
            <span className="text-[10px] text-ink-500 font-mono mt-0.5 block tabular-nums">
              Ref: #{item.referenceNumber || (item as any).referenceNo}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Imposed date',
      accessorKey: 'placedAt',
      cell: (item) => (
        <span className="text-xs text-ink-700 font-mono tabular-nums">
          {formatDate(item.placedAt)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Hold status',
      accessorKey: 'status',
      cell: (item) => {
        const active = isHoldActive(item)
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border',
              active
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-rose-600' : 'bg-emerald-600')} />
            <span>{active ? 'Active hold' : 'Cleared'}</span>
          </span>
        )
      },
      sortable: true,
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => {
        const active = isHoldActive(item)
        return (
          <div className="flex items-center justify-center gap-1.5">
            {active && isApproverOrAdmin && (
              <Button
                variant="secondary"
                size="compact"
                onClick={() => {
                  setSelectedHold(item)
                  setFormError(null)
                  setClearModalOpen(true)
                }}
                leftIcon={<Unlock className="w-3.5 h-3.5 text-ink-700" />}
              >
                Clear hold
              </Button>
            )}
            {!active && (
              <span className="text-[11px] text-ink-500 font-mono tabular-nums">
                Cleared {item.clearedAt ? formatDate(item.clearedAt) : ''}
              </span>
            )}
          </div>
        )
      },
    },
  ]

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setFormError('Statutory reason and grounds are mandatory.')
      return
    }
    setFormError(null)
    createHoldMutation.mutate({
      institutionId: targetInstId,
      reason: reason.trim(),
      sourceBody,
      referenceNumber: referenceNumber.trim() || undefined,
    })
  }

  const handleClearSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHold) return
    if (!clearRemarks.trim()) {
      setFormError('Mandatory justification remarks required to discharge regulatory hold.')
      return
    }
    setFormError(null)
    clearHoldMutation.mutate({
      holdId: selectedHold.id,
      remarks: clearRemarks.trim(),
      referenceNumber: clearRefNumber.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Regulatory Holds"
        description="Statutory freeze authority placed by Vigilance Cell, Grievance Cell, or Court Orders. Active holds block deposit releases."
        action={
          isApproverOrAdmin && (
            <Button
              variant="danger"
              size="default"
              leftIcon={<Lock className="w-4 h-4" />}
              onClick={() => {
                setFormError(null)
                setCreateModalOpen(true)
              }}
            >
              Impose regulatory hold
            </Button>
          )
        }
      />

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-surface border border-line rounded-md shadow-level-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              statusFilter === 'ACTIVE'
                ? 'bg-ink-900 text-white dark:bg-amber-500 dark:text-slate-900 font-semibold'
                : 'text-ink-700 hover:bg-canvas'
            )}
          >
            Active holds ({holds.filter(isHoldActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('CLEARED')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              statusFilter === 'CLEARED'
                ? 'bg-ink-900 text-white dark:bg-amber-500 dark:text-slate-900 font-semibold'
                : 'text-ink-700 hover:bg-canvas'
            )}
          >
            Cleared ({holds.filter((h) => !isHoldActive(h)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              statusFilter === 'all'
                ? 'bg-ink-900 text-white dark:bg-amber-500 dark:text-slate-900 font-semibold'
                : 'text-ink-700 hover:bg-canvas'
            )}
          >
            All holds ({holds.length})
          </button>
        </div>

        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search institution, source, reason..."
            leftElement={<Search className="w-4 h-4 text-ink-500" />}
          />
        </div>
      </div>

      <DataTable<HoldRecord>
        columns={columns}
        data={filteredHolds}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="All institutions are currently clear of freeze orders."
      />

      {/* Impose Hold Modal */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Impose regulatory hold"
        description="Formal freeze instruction. Under AICTE regulations, all deposit releases will be immediately locked."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={createHoldMutation.isPending}
              onClick={handleCreateSubmit}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
            >
              Impose freeze
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <Field label="Target institution" required>
            <Select
              value={targetInstId}
              onChange={(e) => setTargetInstId(e.target.value)}
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name.replace(/^\[DEMO\]\s*/i, '')} ({inst.institutionCode || inst.id})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Source authority" required>
              <Select
                value={sourceBody}
                onChange={(e) => setSourceBody(e.target.value)}
              >
                <option value="VIGILANCE_CELL">AICTE Vigilance Cell</option>
                <option value="GRIEVANCE_CELL">AICTE Student Grievance Cell</option>
                <option value="REGIONAL_OFFICE">AICTE Regional Office</option>
                <option value="HIGH_COURT">High Court Order / Judicial Direction</option>
                <option value="MINISTRY_OF_EDUCATION">Ministry of Education Inquiry</option>
                <option value="COMPETENT_AUTHORITY">Competent Authority / Member Secretary</option>
              </Select>
            </Field>

            <Field label="Order reference number">
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. AICTE/VIG/2026/ORD-89"
              />
            </Field>
          </div>

          <Field label="Statutory grounds & reason" required>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the formal basis for freezing the institution's security deposits..."
              className="w-full p-2.5 text-xs bg-surface border border-line rounded-md focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </form>
      </Dialog>

      {/* Clear Hold Modal */}
      <Dialog
        open={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Discharge regulatory hold"
        description={`Clear statutory hold for ${selectedHold?.institutionName}. Mandatory audit remarks required.`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setClearModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={clearHoldMutation.isPending}
              onClick={handleClearSubmit}
              leftIcon={<Unlock className="w-3.5 h-3.5" />}
            >
              Confirm clearance
            </Button>
          </div>
        }
      >
        <form onSubmit={handleClearSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 bg-canvas rounded-md border border-line space-y-1">
            <span className="text-[10px] text-ink-500 block font-medium">Existing grounds</span>
            <p className="text-xs text-ink-900 font-medium">{selectedHold?.reason}</p>
            <span className="text-[10px] text-ink-500 font-mono block tabular-nums">
              Imposed by: {selectedHold?.sourceBody} on {selectedHold && formatDate(selectedHold.placedAt)}
            </span>
          </div>

          <Field label="Clearance reference number">
            <Input
              value={clearRefNumber}
              onChange={(e) => setClearRefNumber(e.target.value)}
              placeholder="e.g. AICTE/CLR/2026/044"
            />
          </Field>

          <Field label="Clearance remarks (Mandatory)" required>
            <textarea
              rows={4}
              value={clearRemarks}
              onChange={(e) => setClearRemarks(e.target.value)}
              placeholder="State the formal resolution or approval justifying the discharge of this hold..."
              className="w-full p-2.5 text-xs bg-surface border border-line rounded-md focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </form>
      </Dialog>
    </div>
  )
}
