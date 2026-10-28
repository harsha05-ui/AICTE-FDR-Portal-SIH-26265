import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Unlock,
  PlusCircle,
  CheckCircle2,
  XOctagon,
  Clock,
  ArrowUpRight,
  UserCheck,
  Download,
  Lock,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { StageTracker } from '@/components/ui/StageTracker'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/forms/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/forms/CurrencyInput'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate } from '@/lib/format'
import { ReleaseRequest } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'

export const ReleasePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedFdrId = searchParams.get('fdrId')

  const [createModalOpen, setCreateModalOpen] = useState(Boolean(preselectedFdrId))
  const [reviewModal, setReviewModal] = useState<{
    open: boolean
    req: ReleaseRequest | null
  }>({ open: false, req: null })

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean
    req: ReleaseRequest | null
    type: 'APPROVED' | 'DECLINED'
  }>({ open: false, req: null, type: 'APPROVED' })

  const [remarks, setRemarks] = useState('')
  const [remarksError, setRemarksError] = useState<string | null>(null)

  // Form state
  const [fdrId, setFdrId] = useState(preselectedFdrId || '')
  const [requestType, setRequestType] = useState<'RELEASE' | 'REFUND'>('RELEASE')
  const [amount, setAmount] = useState(9000000)
  const [reason, setReason] = useState('Completion of statutory 10-year lock-in period and fulfilment of all AICTE norms.')
  const [councilRef, setCouncilRef] = useState('AICTE/EXC/2026/REL-401')

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  })

  const { data: fdrs = [] } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  const { data: activeHolds = [] } = useQuery({
    queryKey: ['holds', { institutionId: user?.institutionId, status: 'ACTIVE' }],
    queryFn: () => api.holds.list({ institutionId: user?.institutionId, status: 'ACTIVE' }),
    enabled: Boolean(user?.institutionId),
  })

  const hasActiveHold = activeHolds.length > 0
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRequest | null>(null)

  // Filter FDRs eligible for release (Verified instruments)
  const verifiedFdrs = fdrs.filter(
    (f) => (f.verificationStatus || '').toUpperCase() === 'VERIFIED'
  )

  React.useEffect(() => {
    if (!fdrId && (verifiedFdrs.length > 0 || fdrs.length > 0)) {
      const target = verifiedFdrs[0] || fdrs[0]
      setFdrId(target.id)
      setAmount(Number(target.amount || target.depositAmount || 9000000))
    }
  }, [fdrs, verifiedFdrs, fdrId])

  const createMutation = useMutation({
    mutationFn: ({ fdrId, payload }: { fdrId: string; payload: any }) =>
      api.releases.create(fdrId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setCreateModalOpen(false)
      toast({
        title: 'Release request filed',
        description: 'Statutory refund/release application submitted for regulatory review.',
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Application rejected',
        description: err.message || 'Unable to register deposit release request.',
        type: 'danger',
      })
    },
  })

  // Reviewer Review Mutation
  const reviewMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      api.releases.review(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setReviewModal({ open: false, req: null })
      setRemarks('')
      toast({
        title: 'Review completed',
        description: 'Release petition verified and advanced to Approver decision queue.',
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Review error',
        description: err.message || 'Failed to record reviewer findings.',
        type: 'danger',
      })
    },
  })

  // Approver Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: string
      decision: 'APPROVED' | 'DECLINED'
      remarks: string
    }) => api.releases.decision(id, { decision, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      setDecisionModal({ open: false, req: null, type: 'APPROVED' })
      setRemarks('')
      toast({
        title: `Decision recorded`,
        description: `Release determination recorded. Lien instructions updated.`,
        type: decisionModal.type === 'APPROVED' ? 'success' : 'warning',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Decision blocked',
        description: err.message || 'Failed to record approver decision.',
        type: 'danger',
      })
    },
  })

  const isReviewer = user?.role === 'REVIEWER' || user?.role === 'ADMIN'
  const isApprover = user?.role === 'APPROVER' || user?.role === 'ADMIN'
  const isInstitution = user?.role === 'INSTITUTION_USER'

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fdrId) {
      toast({ title: 'Validation error', description: 'Please choose an instrument.', type: 'danger' })
      return
    }
    createMutation.mutate({
      fdrId,
      payload: {
        requestType,
        amount,
        reasonForRelease: reason,
        councilApprovalRef: councilRef,
      },
    })
  }

  const handleExecuteReview = () => {
    if (!remarks.trim() || remarks.trim().length < 5) {
      setRemarksError('Reviewer audit remarks are required (minimum 5 characters).')
      return
    }
    if (!reviewModal.req) return
    setRemarksError(null)
    reviewMutation.mutate({
      id: reviewModal.req.id,
      remarks: remarks.trim(),
    })
  }

  const handleExecuteDecision = () => {
    if (!remarks.trim() || remarks.trim().length < 5) {
      setRemarksError('Statutory decision justification is required (minimum 5 characters).')
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

  const openReview = (req: ReleaseRequest) => {
    setRemarksError(null)
    setRemarks('All statutory obligations satisfied. Verified lock-in period and clearance certificates in order.')
    setReviewModal({ open: true, req })
  }

  const openDecision = (req: ReleaseRequest, type: 'APPROVED' | 'DECLINED') => {
    setRemarksError(null)
    setRemarks(
      type === 'APPROVED'
        ? `Council approval ref ${req.councilApprovalRef || councilRef} verified. Deposit release authorized and lien relinquished.`
        : 'Deposit release rejected: institution has unresolved non-compliance notices.'
    )
    setDecisionModal({ open: true, req, type })
  }

  const columns: Column<ReleaseRequest>[] = [
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
      header: 'Release amount',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <span className="font-mono font-medium text-ink-900 tabular-nums text-xs">
          {formatINR(item.amount)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Council ref',
      accessorKey: 'councilApprovalRef',
      cell: (item) => (
        <span className="font-mono text-xs text-ink-700 tabular-nums">
          {item.councilApprovalRef || item.councilOrderRef || 'Pending EC'}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Submission date',
      accessorKey: 'submissionDate',
      cell: (item) => (
        <span className="text-xs text-ink-700 font-mono tabular-nums">
          {formatDate(item.submissionDate)}
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
      header: 'Actions',
      align: 'center',
      cell: (item) => {
        const s = (item.requestStatus || item.status || '').toUpperCase()

        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* Step 1: Reviewer Review if status is SUBMITTED */}
            {isReviewer && s === 'SUBMITTED' && (
              <Button
                variant="primary"
                size="compact"
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                onClick={() => openReview(item)}
              >
                Review
              </Button>
            )}

            {/* Step 2: Approver Decision if status is UNDER_REVIEW */}
            {isApprover && s === 'UNDER_REVIEW' && (
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
            )}

            {s === 'APPROVED' && (
              <Button
                variant="secondary"
                size="compact"
                leftIcon={<Download className="w-3.5 h-3.5 text-ink-700" />}
                onClick={() => api.releases.downloadOrder(item.id)}
                title="Download Sanction Order / NOC PDF"
              >
                NOC order
              </Button>
            )}

            {s === 'DECLINED' && (
              <span className="text-xs font-medium text-rose-700 flex items-center gap-1">
                <XOctagon className="w-3.5 h-3.5" />
                <span>Declined</span>
              </span>
            )}

            <Button
              variant="secondary"
              size="compact"
              onClick={() => setSelectedRelease(selectedRelease?.id === item.id ? null : item)}
              title="Inspect multi-office pipeline"
            >
              {selectedRelease?.id === item.id ? 'Hide stages' : 'Stages'}
            </Button>

            <Button
              variant="secondary"
              size="compact"
              onClick={() => navigate(`/fdrs/${item.fdrId}`)}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              View
            </Button>
          </div>
        )
      },
    },
  ]

  const totalCount = releases.length
  const pendingCount = releases.filter((r) => {
    const s = (r.requestStatus || r.status || '').toUpperCase()
    return s === 'SUBMITTED' || s === 'UNDER_REVIEW'
  }).length
  const approvedCount = releases.filter(
    (r) => (r.requestStatus || r.status || '').toUpperCase() === 'APPROVED'
  ).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Releases & Refunds"
        description="Sequential 5-desk consensus workflow: Regional Office, Bureau, Grievance, Vigilance, and Competent Authority."
        action={
          isInstitution && (
            <Button
              variant={hasActiveHold ? 'secondary' : 'primary'}
              size="default"
              disabled={hasActiveHold}
              leftIcon={hasActiveHold ? <Lock className="w-4 h-4 text-rose-600" /> : <PlusCircle className="w-4 h-4" />}
              onClick={() => {
                if (hasActiveHold) return
                setCreateModalOpen(true)
              }}
              title={hasActiveHold ? `Release blocked by hold: ${activeHolds[0]?.reason}` : undefined}
            >
              {hasActiveHold ? 'Release locked (Hold active)' : 'Apply for release'}
            </Button>
          )
        }
      />

      {/* Regulatory Hold Alert Banner */}
      {hasActiveHold && (
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-md flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-800 shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-950">
                Statutory release blocked: Active regulatory hold
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 font-medium">
                Source: {activeHolds[0].sourceBody}
              </span>
            </div>
            <p className="text-rose-800 mt-1">
              {activeHolds[0].reason}. All refund petitions are frozen until formal clearance by the Competent Authority.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Multi-Office Stage Tracker Ribbon */}
      {selectedRelease && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-700 px-1">
            <span>
              Pipeline stages for: <strong className="font-mono text-ink-900 tabular-nums">{selectedRelease.fdrNumber}</strong> ({selectedRelease.institutionName})
            </span>
            <Button
              variant="ghost"
              size="compact"
              onClick={() => setSelectedRelease(null)}
              className="text-xs text-ink-500 hover:text-ink-900"
            >
              Close
            </Button>
          </div>
          <StageTracker
            stages={selectedRelease.stages}
            currentStageOffice={selectedRelease.currentStage?.office}
          />
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Total applications</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {totalCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-700">
            <Unlock className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Pending review / approval</span>
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
            <span className="text-xs text-ink-500 font-medium block">Approved releases</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {approvedCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={releases}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No release or refund petitions recorded."
      />

      {/* Create Release Modal */}
      <Dialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Apply for deposit release"
        description="Formal petition to relinquish statutory lien after completion of mandatory lock-in period."
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
              Submit application
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <Field
            label="Eligible verified instrument"
            required
            hint="Only instruments verified by AICTE can be released"
          >
            <Select
              value={fdrId}
              onChange={(e) => {
                setFdrId(e.target.value)
                const sel = fdrs.find((x) => x.id === e.target.value)
                if (sel) {
                  setAmount(Number(sel.amount || sel.depositAmount || 9000000))
                }
              }}
              options={(verifiedFdrs.length > 0 ? verifiedFdrs : fdrs).map((f) => ({
                value: f.id,
                label: `${f.fdrNumber || f.referenceNumber} - ${f.bankName} (${f.verificationStatus}) [${formatINR(f.amount || f.depositAmount || 0)}]`,
              }))}
            />
          </Field>

          <Field label="Petition type" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('RELEASE')}
                className={`p-3 text-left border rounded-md transition-all ${
                  requestType === 'RELEASE'
                    ? 'border-ink-900 bg-surface shadow-sm ring-1 ring-ink-900 text-ink-900 font-medium'
                    : 'border-line text-ink-700 bg-surface hover:bg-canvas'
                }`}
              >
                <div className="font-medium">Lien release</div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  Relinquish joint AICTE lien
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('REFUND')}
                className={`p-3 text-left border rounded-md transition-all ${
                  requestType === 'REFUND'
                    ? 'border-ink-900 bg-surface shadow-sm ring-1 ring-ink-900 text-ink-900 font-medium'
                    : 'border-line text-ink-700 bg-surface hover:bg-canvas'
                }`}
              >
                <div className="font-medium">Security refund</div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  Refund upon approved program closure
                </div>
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Release amount (INR)"
              required
              value={amount}
              onChange={(val) => setAmount(val)}
            />
            <Field label="Council approval reference" required>
              <Input
                value={councilRef}
                onChange={(e) => setCouncilRef(e.target.value)}
                placeholder="e.g. AICTE/EXC/2026/REL-401"
              />
            </Field>
          </div>

          <Field label="Grounds / reason for release" required>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface text-ink-900 border border-line rounded-md p-2.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </form>
      </Dialog>

      {/* Reviewer Review Modal (Step 1) */}
      <Dialog
        open={reviewModal.open}
        onClose={() => setReviewModal({ open: false, req: null })}
        title="Reviewer compliance audit"
        description={`Conduct preliminary audit for release petition on ${reviewModal.req?.fdrNumber}. Remarks are required.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReviewModal({ open: false, req: null })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={reviewMutation.isPending}
              onClick={handleExecuteReview}
            >
              Confirm review & advance
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-canvas border border-line rounded-md text-ink-900 space-y-1">
            <div className="font-medium">
              Instrument: {reviewModal.req?.fdrNumber} ({formatINR(reviewModal.req?.amount || 0)})
            </div>
            <div className="text-[11px] text-ink-500">
              Institution: {reviewModal.req?.institutionName} • Council ref: {reviewModal.req?.councilApprovalRef}
            </div>
          </div>

          <Field
            label="Reviewer compliance audit remarks"
            required
            error={remarksError || undefined}
            hint="Mandatory observations regarding lock-in period and clearance"
          >
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value)
                if (remarksError) setRemarksError(null)
              }}
              placeholder="State verification of 10-year term, council orders, and absence of outstanding penalty demands..."
              className="w-full bg-surface text-ink-900 border border-line rounded-md p-2.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </div>
      </Dialog>

      {/* Approver Decision Modal (Step 2) */}
      <Dialog
        open={decisionModal.open}
        onClose={() => setDecisionModal({ ...decisionModal, open: false })}
        title={`Authority order: ${decisionModal.type}`}
        description={`Formal statutory determination on release petition for ${decisionModal.req?.fdrNumber}. Remarks are required.`}
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
              Inscribe order & finalize
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-canvas border border-line rounded-md text-ink-900 space-y-1">
            <div className="font-medium">
              Instrument: {decisionModal.req?.fdrNumber} ({formatINR(decisionModal.req?.amount || 0)})
            </div>
            <div className="text-[11px] text-ink-500">
              Institution: {decisionModal.req?.institutionName}
            </div>
          </div>

          <Field
            label="Authority order remarks & justification"
            required
            error={remarksError || undefined}
            hint="Mandatory order citation (minimum 5 characters)"
          >
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value)
                if (remarksError) setRemarksError(null)
              }}
              placeholder="State council resolution date, authorized official reference number, or justification..."
              className="w-full bg-surface text-ink-900 border border-line rounded-md p-2.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
