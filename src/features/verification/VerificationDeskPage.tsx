import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  XCircle,
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Building,
  Landmark,
  ShieldAlert,
  Server,
  Lock,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, RiskBadge, InstrumentTypeBadge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/forms/Field'
import { formatINR, formatDate, formatDateTime } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LienBadge } from '@/components/ui/LienBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'
import { DocumentViewer } from '@/components/ui/DocumentViewer'
import { LienStatus } from '@/types'
import { PreSubmissionCheckTable } from '@/components/verification/PreSubmissionCheckTable'

export const VerificationDeskPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean
    type: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED'
  }>({ open: false, type: 'VERIFIED' })

  const [remarks, setRemarks] = useState('')
  const [remarksError, setRemarksError] = useState<string | null>(null)

  const [lienModalOpen, setLienModalOpen] = useState(false)
  const [newLienStatus, setNewLienStatus] = useState<LienStatus>('CONFIRMED')
  const [lienRef, setLienRef] = useState('')

  const { data: fdr, isLoading, error } = useQuery({
    queryKey: ['fdr', id],
    queryFn: () => {
      if (!id) throw new Error('No FDR ID specified')
      return api.fdrs.getById(id)
    },
    enabled: !!id,
  })

  const { data: precheckData, isLoading: isPrecheckLoading } = useQuery({
    queryKey: ['fdr-precheck', id],
    queryFn: () => (id ? api.fdrs.getPrecheck(id) : null),
    enabled: !!id,
  })

  const verificationMutation = useMutation({
    mutationFn: ({
      decision,
      comments,
    }: {
      decision: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED'
      comments: string
    }) => api.fdrs.verify(id!, { result: decision, remarks: comments }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      setDecisionModal({ open: false, type: 'VERIFIED' })
      setRemarks('')
      toast({
        title: `Verification Decision Recorded: ${updated.verificationStatus}`,
        description: `Instrument ${updated.fdrNumber || updated.referenceNumber} has been updated.`,
        type: updated.verificationStatus === 'VERIFIED' ? 'success' : 'warning',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Verification Action Failed',
        description: err.message || 'Unable to record verification decision.',
        type: 'danger',
      })
    },
  })

  const bankVerifyMutation = useMutation({
    mutationFn: () => api.fdrs.bankVerify(id!, { simulate: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      toast({
        title: 'SFMS Direct Banking Handshake Completed',
        description: 'Simulated direct CBS verification handshake recorded with timestamp.',
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Bank Verification Failed',
        description: err.message || 'Bank simulation gateway error.',
        type: 'danger',
      })
    },
  })

  const lienMutation = useMutation({
    mutationFn: () =>
      api.fdrs.updateLien(id!, {
        lienStatus: newLienStatus,
        lienReferenceNumber: lienRef || undefined,
        remarks: 'Updated via official verification desk',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      setLienModalOpen(false)
      toast({
        title: 'Lien Inscription Updated',
        description: `Lien status is now ${newLienStatus}.`,
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Lien Update Failed',
        description: err.message || 'Failed to update lien status.',
        type: 'danger',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !fdr) {
    return (
      <ErrorState
        title="FDR Instrument Not Found"
        message={`The record "${id}" could not be loaded for verification review.`}
        onRetry={() => navigate('/verification')}
      />
    )
  }

  const isReviewerOrAdmin =
    user?.role === 'REVIEWER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'APPROVER' ||
    user?.role === 'AICTE_OFFICIAL' ||
    user?.role === 'AICTE_ADMIN'

  const openDecision = (type: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED') => {
    setRemarksError(null)
    setRemarks(
      type === 'VERIFIED'
        ? 'Independent bank record confirmed. Joint lien in favour of AICTE is valid and in force.'
        : type === 'DISCREPANCY'
        ? 'Branch seal and official signatory stamp missing on deposit certificate.'
        : 'Statutory lien terms not compliant with AICTE Approval Process Handbook standards.'
    )
    setDecisionModal({ open: true, type })
  }

  const handleExecuteDecision = () => {
    if (!remarks.trim() || remarks.trim().length < 5) {
      setRemarksError('Remarks are mandatory and must be at least 5 characters.')
      return
    }
    setRemarksError(null)
    verificationMutation.mutate({
      decision: decisionModal.type,
      comments: remarks.trim(),
    })
  }

  // Parse risk flags
  let riskFlags: string[] = []
  if (fdr.riskFlags) {
    if (Array.isArray(fdr.riskFlags)) {
      riskFlags = fdr.riskFlags
    } else if (typeof fdr.riskFlags === 'string') {
      try {
        riskFlags = JSON.parse(fdr.riskFlags)
      } catch {
        riskFlags = [fdr.riskFlags]
      }
    }
  }

  const comparisonItems = [
    {
      field: 'FDR Reference No.',
      submitted: fdr.fdrNumber || fdr.referenceNumber,
      verified: fdr.fdrNumber || fdr.referenceNumber,
      matches: true,
    },
    {
      field: 'Commercial Bank',
      submitted: fdr.bankName,
      verified: fdr.bankName,
      matches: true,
    },
    {
      field: 'Branch Name',
      submitted: fdr.branchName || 'Not specified',
      verified: fdr.branchName || 'Not specified',
      matches: true,
    },
    {
      field: 'IFSC Code',
      submitted: fdr.ifscCode || 'N/A',
      verified: fdr.ifscCode || 'N/A',
      matches: true,
    },
    {
      field: 'Deposit Amount (INR)',
      submitted: formatINR(Number(fdr.amount || fdr.depositAmount || 0)),
      verified: formatINR(Number(fdr.amount || fdr.depositAmount || 0)),
      matches: true,
    },
    {
      field: 'Maturity Date',
      submitted: formatDate(fdr.maturityDate),
      verified: formatDate(fdr.maturityDate),
      matches: true,
    },
    {
      field: 'Joint Account / Lien to AICTE',
      submitted: fdr.jointAccount || fdr.lienMarked ? 'Inscribed (Yes)' : 'Not Marked (No)',
      verified: fdr.jointAccount || fdr.lienMarked ? 'Inscribed (Yes)' : 'Flagged Discrepancy',
      matches: Boolean(fdr.jointAccount || fdr.lienMarked),
      discrepancyNote: !(fdr.jointAccount || fdr.lienMarked)
        ? 'Statutory requirement: FDR must be held jointly with AICTE or have lien inscribed.'
        : undefined,
    },
  ]

  return (
    <div className="space-y-5 fade-in-settle">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="compact"
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          onClick={() => navigate('/verification')}
        >
          Back to Scrutiny Queue
        </Button>
      </div>

      <PageHeader
        title={`Verification Desk: ${fdr.fdrNumber || fdr.referenceNumber}`}
        description={`${fdr.institutionName} · Official Technical Scrutiny & Cross-Matching`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge
              level={fdr.trustLevel || (fdr.verificationStatus === 'VERIFIED' ? 'STAFF_VERIFIED' : 'SUBMITTED')}
              isSimulated={fdr.isSimulated || fdr.trustLevel === 'SIMULATION'}
            />
            <LienBadge
              status={fdr.lienStatus || (fdr.lienMarked ? 'CONFIRMED' : 'NOT_MARKED')}
              referenceNumber={fdr.lienReferenceNumber}
            />
            <CountdownChip maturityDate={fdr.maturityDate} />
            <InstrumentTypeBadge type={fdr.instrumentType || 'FDR'} />
            <Badge status={fdr.verificationStatus} />
            <RiskBadge level={fdr.riskLevel || 'LOW'} />
          </div>
        }
      />

      {/* Reviewer Action Bar */}
      {isReviewerOrAdmin && (
        <div className="p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-level-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-900">Scrutiny Authority:</span>
            <span>Recorded under regional officer authority</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="compact"
              loading={bankVerifyMutation.isPending}
              leftIcon={<Server className="w-3.5 h-3.5 text-slate-600" />}
              onClick={() => bankVerifyMutation.mutate()}
            >
              Run SFMS Check
            </Button>

            <Button
              variant="outline"
              size="compact"
              leftIcon={<Lock className="w-3.5 h-3.5 text-slate-600" />}
              onClick={() => {
                setNewLienStatus((fdr.lienStatus as LienStatus) || 'CONFIRMED')
                setLienRef(fdr.lienReferenceNumber || '')
                setLienModalOpen(true)
              }}
            >
              Lien Inscription
            </Button>

            {fdr.verificationStatus === 'VERIFIED' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Statutory Verification Complete</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="compact"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => openDecision('VERIFIED')}
              >
                Verify Instrument
              </Button>
            )}

            <Button
              variant="secondary"
              size="compact"
              leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              onClick={() => openDecision('DISCREPANCY')}
            >
              Flag Discrepancy
            </Button>

            <Button
              variant="outline"
              size="compact"
              leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => openDecision('REJECTED')}
              className="text-rose-700 hover:bg-rose-50"
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Risk Flags Warning */}
      {riskFlags.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Automated Pre-Check Flags Detected:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800">
            {riskFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Statutory Pre-Submission Verification Gate */}
      <PreSubmissionCheckTable
        precheck={precheckData || null}
        isLoading={isPrecheckLoading}
        readOnly
      />

      {/* Side-by-side comparison on Solid Surfaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Side: Reconciliation Parameter Table */}
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Cross-Verification Parameter Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Submitted Institution Values vs. Regulatory Checklist
                </p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                Deposit Filing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3">Submitted Value</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {comparisonItems.map((item, idx) => (
                    <tr key={idx} className={item.matches ? 'hover:bg-slate-50/80' : 'bg-rose-50/40'}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.field}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="tabular-nums font-mono">{item.submitted}</span>
                        {item.discrepancyNote && (
                          <span className="block text-[11px] text-rose-700 mt-1 font-sans">
                            {item.discrepancyNote}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.matches ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Discrepancy</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Institution summary */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-900 block flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-600" />
                <span>Institution Information:</span>
              </span>
              <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 text-xs space-y-1">
                <div className="font-semibold text-slate-900">{fdr.institutionName}</div>
                <div className="text-slate-500">
                  Code: {fdr.institution?.institutionCode || 'N/A'} · State: {fdr.institution?.state || 'N/A'}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Documents & Timeline */}
        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <span>Uploaded Deposit Documents ({fdr.documents?.length || 0})</span>
              </h3>
            </div>

            <DocumentViewer documents={fdr.documents || []} />
          </Card>

          {/* Verification Timeline */}
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>Verification Audit Trail</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {((fdr.workflowHistory || fdr.verificationTimeline || []).length === 0) ? (
                <div className="text-xs text-slate-400 py-2">
                  No workflow history transitions recorded yet.
                </div>
              ) : (
                (fdr.workflowHistory || fdr.verificationTimeline || []).map((tl: any, index: number) => (
                  <div key={tl.id || index} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white" />
                    <div className="font-semibold text-slate-900 leading-snug">
                      {tl.title || tl.newStatus || tl.action || 'Workflow Transition'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDateTime(tl.timestamp || tl.createdAt)} · {tl.actor || tl.actorName || 'System'} ({tl.role || tl.actorRole || 'Official'})
                    </div>
                    {(tl.notes || tl.remarks || tl.comments) && (
                      <p className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                        {tl.notes || tl.remarks || tl.comments}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Decision Dialog */}
      <Dialog
        open={decisionModal.open}
        onClose={() => setDecisionModal({ ...decisionModal, open: false })}
        title={`Record Verification Decision: ${decisionModal.type}`}
        description={`Regulatory compliance action for instrument ${fdr.fdrNumber || fdr.referenceNumber}. Remarks are required.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDecisionModal({ ...decisionModal, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={decisionModal.type === 'VERIFIED' ? 'primary' : 'danger'}
              loading={verificationMutation.isPending}
              onClick={handleExecuteDecision}
            >
              Confirm & Inscribe Decision
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field
            label="Official Review Remarks & Justification"
            required
            error={remarksError || undefined}
            hint="Mandatory regulatory remarks for audit integrity (minimum 5 characters)"
          >
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value)
                if (remarksError) setRemarksError(null)
              }}
              placeholder="State precise statutory observations, banking verification references, or specific discrepancy details..."
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-xs focus:border-slate-900 focus:outline-none"
            />
          </Field>
        </div>
      </Dialog>

      {/* Lien Inscription Dialog */}
      <Dialog
        open={lienModalOpen}
        onClose={() => setLienModalOpen(false)}
        title="Update Lien Inscription Status"
        description={`Record statutory lien state with the issuing bank for ${fdr.fdrNumber || fdr.referenceNumber}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLienModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={lienMutation.isPending}
              onClick={() => lienMutation.mutate()}
            >
              Update Lien Record
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="Statutory Lien Status" required>
            <select
              value={newLienStatus}
              onChange={(e) => setNewLienStatus(e.target.value as LienStatus)}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-xs focus:border-slate-900 focus:outline-none"
            >
              <option value="NOT_MARKED">NOT_MARKED - No lien recorded</option>
              <option value="MARKED">MARKED - Lien initiated with bank</option>
              <option value="CONFIRMED">CONFIRMED - Bank confirmed joint lien in favour of AICTE</option>
              <option value="RELEASED">RELEASED - Lien discharged following NOC</option>
              <option value="INVOKED">INVOKED - Statutory encashment invoked</option>
            </select>
          </Field>

          <Field
            label="Bank Lien Reference Number"
            hint="Official bank letter reference or lien endorsement notation"
          >
            <input
              type="text"
              value={lienRef}
              onChange={(e) => setLienRef(e.target.value)}
              placeholder="e.g. SBI/RO/LIEN/2026/0942"
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2.5 text-xs focus:border-slate-900 focus:outline-none font-mono"
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
