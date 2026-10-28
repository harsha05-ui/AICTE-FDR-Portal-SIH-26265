import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  ArrowRightLeft,
  PlusCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/forms/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/forms/CurrencyInput'
import { DateField } from '@/components/forms/DateField'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate } from '@/lib/format'
import { RenewalRequest } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'

export const RenewalPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedFdrId = searchParams.get('fdrId')

  const [createModalOpen, setCreateModalOpen] = useState(Boolean(preselectedFdrId))
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean
    req: RenewalRequest | null
    type: 'APPROVED' | 'DECLINED'
  }>({ open: false, req: null, type: 'APPROVED' })

  const [remarks, setRemarks] = useState('')
  const [remarksError, setRemarksError] = useState<string | null>(null)

  // Form state for creating renewal
  const [fdrId, setFdrId] = useState(preselectedFdrId || '')
  const [requestType, setRequestType] = useState<'RENEWAL' | 'REPLACEMENT'>('RENEWAL')
  const [proposedAmount, setProposedAmount] = useState(10000000)
  const [proposedMaturity, setProposedMaturity] = useState('2031-11-20')
  const [newBankName, setNewBankName] = useState('State Bank of India')
  const [newBranchName, setNewBranchName] = useState('Parliament Street, New Delhi')
  const [justification, setJustification] = useState('Statutory 5-year security deposit extension for AICTE regulatory compliance.')

  const { data: renewals = [], isLoading } = useQuery({
    queryKey: ['renewals'],
    queryFn: () => api.renewals.list(),
  })

  const { data: fdrs = [] } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  // Set default fdrId once fdrs load if not already set
  React.useEffect(() => {
    if (!fdrId && fdrs.length > 0) {
      setFdrId(fdrs[0].id)
      setProposedAmount(Number(fdrs[0].amount || fdrs[0].depositAmount || 10000000))
    }
  }, [fdrs, fdrId])

  const selectedFdr = fdrs.find((f) => f.id === fdrId)

  const createMutation = useMutation({
    mutationFn: ({ fdrId, payload }: { fdrId: string; payload: any }) =>
      api.renewals.create(fdrId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setCreateModalOpen(false)
      toast({
        title: 'Petition registered',
        description: 'Statutory renewal application recorded for review.',
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Submission failed',
        description: err.message || 'Unable to submit renewal request.',
        type: 'danger',
      })
    },
  })

  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: string
      decision: 'APPROVED' | 'DECLINED'
      remarks: string
    }) => api.renewals.decision(id, { decision, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      setDecisionModal({ open: false, req: null, type: 'APPROVED' })
      setRemarks('')
      toast({
        title: 'Decision recorded',
        description: `Request was ${decisionModal.type.toLowerCase()}. Linked instrument updated.`,
        type: decisionModal.type === 'APPROVED' ? 'success' : 'warning',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Decision error',
        description: err.message || 'Failed to record decision.',
        type: 'danger',
      })
    },
  })

  const isApproverOrAdmin =
    user?.role === 'APPROVER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'AICTE_ADMIN' ||
    user?.role === 'AICTE_OFFICIAL'

  const isInstitution = user?.role === 'INSTITUTION_USER'

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fdrId) {
      toast({ title: 'Validation error', description: 'Please select an instrument.', type: 'danger' })
      return
    }
    createMutation.mutate({
      fdrId,
      payload: {
        type: requestType,
        proposedAmount,
        proposedMaturityDate: proposedMaturity,
        newBankName: requestType === 'REPLACEMENT' ? newBankName : undefined,
        newBranchName: requestType === 'REPLACEMENT' ? newBranchName : undefined,
        justification,
      },
    })
  }

  const handleExecuteDecision = () => {
    if (!remarks.trim() || remarks.trim().length < 5) {
      setRemarksError('Justification remarks are mandatory (minimum 5 characters).')
      return
    }
    if (!decisionModal.req) return
    setRemarksError(null)
    decisionMutation.mutate({
      id: decisionModal.req.id,
      decision: decisionModal.type,
      remarks: remarks.trim(),
    })
  }

  const openDecision = (req: RenewalRequest, type: 'APPROVED' | 'DECLINED') => {
    setRemarksError(null)
    setRemarks(
      type === 'APPROVED'
        ? 'Statutory term extension authorized. Replacement instrument inscribed with joint AICTE lien.'
        : 'Renewal application declined: terms do not meet mandated minimum deposit schedule.'
    )
    setDecisionModal({ open: true, req, type })
  }

  const columns: Column<RenewalRequest>[] = [
    {
      header: 'Instrument / FDR no.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div className="space-y-0.5">
          <span className="font-mono font-medium text-ink-900 block text-xs tabular-nums">
            {item.fdrNumber}
          </span>
          <span className="text-[11px] text-ink-500 block truncate max-w-xs">
            {item.institutionName}
          </span>
          <InstrumentSourceBadge />
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Operation type',
      accessorKey: 'requestType',
      cell: (item) => {
        const isRepl = (item.requestType || item.type || '').toUpperCase() === 'REPLACEMENT'
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-900">
            {isRepl ? (
              <ArrowRightLeft className="w-3.5 h-3.5 text-ink-500" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-ink-500" />
            )}
            <span>{isRepl ? 'Replacement' : 'Renewal'}</span>
          </span>
        )
      },
      sortable: true,
    },
    {
      header: 'Proposed amount',
      accessorKey: 'proposedAmount',
      align: 'right',
      cell: (item) => (
        <span className="font-mono font-medium text-ink-900 tabular-nums text-xs">
          {formatINR(item.proposedAmount || item.amount || 0)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Proposed maturity',
      accessorKey: 'proposedMaturityDate',
      cell: (item) => (
        <span className="text-xs text-ink-700 font-mono tabular-nums">
          {formatDate(item.proposedMaturityDate)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'requestStatus',
      cell: (item) => <Badge status={item.requestStatus || item.status} />,
      sortable: true,
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => {
        const s = (item.requestStatus || item.status || '').toUpperCase()
        const isPending = s === 'SUBMITTED' || s === 'UNDER_REVIEW'

        return (
          <div className="flex items-center justify-center gap-1.5">
            {isApproverOrAdmin && isPending ? (
              <>
                <Button
                  variant="primary"
                  size="compact"
                  onClick={() => openDecision(item, 'APPROVED')}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="compact"
                  onClick={() => openDecision(item, 'DECLINED')}
                >
                  Decline
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="compact"
                onClick={() => navigate(`/fdrs/${item.fdrId}`)}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                View
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const totalCount = renewals.length
  const pendingCount = renewals.filter((r) => {
    const s = (r.requestStatus || r.status || '').toUpperCase()
    return s === 'SUBMITTED' || s === 'UNDER_REVIEW'
  }).length
  const approvedCount = renewals.filter(
    (r) => (r.requestStatus || r.status || '').toUpperCase() === 'APPROVED'
  ).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Renewals & Replacements"
        description="Formal petition and approval workflow for maturing fixed deposit receipts and bank transfers."
        action={
          isInstitution && (
            <Button
              variant="primary"
              size="default"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Petition renewal or replacement
            </Button>
          )
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Total petitions</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {totalCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-700">
            <RefreshCw className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Pending action</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {pendingCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Clock className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Approved & completed</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {approvedCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </Card>
      </div>

      {/* Renewals Table */}
      <DataTable
        columns={columns}
        data={renewals}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No renewal or replacement petitions recorded."
      />

      {/* Create Modal for Institution */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Petition renewal or replacement"
        description="Formal petition to extend the lock-in tenure or transfer the banking partner of an existing FDR."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={handleCreateSubmit}
            >
              Submit petition
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <Field label="Target maturing FDR" required>
            <Select
              value={fdrId}
              onChange={(e) => {
                setFdrId(e.target.value)
                const sel = fdrs.find((x) => x.id === e.target.value)
                if (sel) {
                  setProposedAmount(Number(sel.amount || sel.depositAmount || 10000000))
                }
              }}
              options={fdrs.map((f) => ({
                value: f.id,
                label: `${f.fdrNumber || f.referenceNumber} - ${f.bankName} (${formatINR(f.amount || f.depositAmount || 0)})`,
              }))}
            />
          </Field>

          <Field label="Petition type" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('RENEWAL')}
                className={`p-3 text-left border rounded-md transition-all ${
                  requestType === 'RENEWAL'
                    ? 'border-ink-900 bg-surface shadow-sm ring-1 ring-ink-900 text-ink-900 font-medium'
                    : 'border-line text-ink-700 bg-surface hover:bg-canvas'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-ink-700" />
                  <span>Same bank extension</span>
                </div>
                <div className="text-[11px] text-ink-500 mt-1">
                  Rollover deposit with existing schedule
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('REPLACEMENT')}
                className={`p-3 text-left border rounded-md transition-all ${
                  requestType === 'REPLACEMENT'
                    ? 'border-ink-900 bg-surface shadow-sm ring-1 ring-ink-900 text-ink-900 font-medium'
                    : 'border-line text-ink-700 bg-surface hover:bg-canvas'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-ink-700" />
                  <span>Bank replacement</span>
                </div>
                <div className="text-[11px] text-ink-500 mt-1">
                  Transfer to new scheduled commercial bank
                </div>
              </button>
            </div>
          </Field>

          {/* Side-by-side comparison */}
          {selectedFdr && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-md border border-line bg-canvas text-xs">
              <div className="p-3 bg-surface rounded-md border border-line space-y-1">
                <span className="text-[10px] text-ink-500 block font-medium">
                  Current instrument
                </span>
                <div className="font-mono text-ink-900 font-medium tabular-nums truncate">
                  {selectedFdr.fdrNumber}
                </div>
                <div className="text-ink-700">{selectedFdr.bankName}</div>
                <div className="font-mono text-ink-900 tabular-nums">
                  {formatINR(selectedFdr.amount || selectedFdr.depositAmount || 0)}
                </div>
                <div className="text-[11px] text-ink-500 font-mono tabular-nums">
                  Matures: {formatDate(selectedFdr.maturityDate)}
                </div>
              </div>

              <div className="p-3 bg-surface rounded-md border border-line space-y-1">
                <span className="text-[10px] text-ink-700 block font-medium">
                  Proposed {requestType === 'REPLACEMENT' ? 'replacement' : 'renewal'}
                </span>
                <div className="font-mono text-ink-900 font-medium tabular-nums truncate">
                  {requestType === 'REPLACEMENT' ? (newBankName || 'New Bank') : selectedFdr.bankName}
                </div>
                <div className="text-ink-700">
                  {requestType === 'REPLACEMENT' ? (newBranchName || 'Branch') : selectedFdr.branchName}
                </div>
                <div className="font-mono text-ink-900 tabular-nums font-semibold">
                  {formatINR(proposedAmount)}
                </div>
                <div className="text-[11px] text-ink-700 font-mono tabular-nums">
                  Matures: {formatDate(proposedMaturity)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Mandated deposit amount (INR)"
              required
              value={proposedAmount}
              onChange={(val) => setProposedAmount(val)}
            />
            <DateField
              label="Proposed extended maturity"
              required
              value={proposedMaturity}
              onChange={(e) => setProposedMaturity(e.target.value)}
            />
          </div>

          {requestType === 'REPLACEMENT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-canvas rounded-md border border-line">
              <Field label="Replacement scheduled bank" required>
                <Input
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Punjab National Bank"
                />
              </Field>
              <Field label="Branch name & location" required>
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Connaught Place Branch"
                />
              </Field>
            </div>
          )}

          <Field label="Reason / justification" required>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-surface text-ink-900 border border-line rounded-md p-2.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </form>
      </Dialog>

      {/* Decision Dialog for Approver with MANDATORY Remarks */}
      <Dialog
        open={decisionModal.open}
        onClose={() => setDecisionModal({ ...decisionModal, open: false })}
        title={`Authority decision: ${decisionModal.type}`}
        description={`Formal resolution on ${decisionModal.req?.requestType || 'Renewal'} petition for ${decisionModal.req?.fdrNumber}. Remarks are required.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDecisionModal({ ...decisionModal, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={decisionModal.type === 'APPROVED' ? 'primary' : 'danger'}
              loading={decisionMutation.isPending}
              onClick={handleExecuteDecision}
            >
              Record decision
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-canvas border border-line rounded-md text-ink-900 space-y-1">
            <div className="font-medium">
              Instrument: {decisionModal.req?.fdrNumber} ({formatINR(decisionModal.req?.proposedAmount || decisionModal.req?.amount || 0)})
            </div>
            <div className="text-[11px] text-ink-500">
              Institution: {decisionModal.req?.institutionName}
            </div>
          </div>

          <Field
            label="Authority order remarks"
            required
            error={remarksError || undefined}
            hint="Mandatory remarks for government audit trail (minimum 5 characters)"
          >
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value)
                if (remarksError) setRemarksError(null)
              }}
              placeholder="State regulatory approval citation, order number, or reason for decline..."
              className="w-full bg-surface text-ink-900 border border-line rounded-md p-2.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
