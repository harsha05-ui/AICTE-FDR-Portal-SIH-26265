import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Landmark,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRightLeft,
  RefreshCw,
  Unlock,
  AlertTriangle,
  Download,
  Upload,
  Send,
  Lock,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LienBadge } from '@/components/ui/LienBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'
import { Dialog } from '@/components/ui/Dialog'
import { Tabs } from '@/components/ui/Tabs'
import { FileDropzone } from '@/components/forms/FileDropzone'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthContext'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/feedback/Toast'
import { PreSubmissionCheckTable } from '@/components/verification/PreSubmissionCheckTable'

export const FDRDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'overview' | 'precheck' | 'timeline'>('overview')

  // State for modals
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyResult, setVerifyResult] = useState<'VERIFIED' | 'DISCREPANCY' | 'REJECTED'>('VERIFIED')
  const [verifyRemarks, setVerifyRemarks] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [renewalModalOpen, setRenewalModalOpen] = useState(false)
  const [renewalType, setRenewalType] = useState<'RENEWAL' | 'REPLACEMENT'>('RENEWAL')
  const [renewalJustification, setRenewalJustification] = useState('')
  const [renewalError, setRenewalError] = useState<string | null>(null)

  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [releaseReason, setReleaseReason] = useState('')
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const { data: fdr, isLoading, error } = useQuery({
    queryKey: ['fdr', id],
    queryFn: () => api.fdrs.getById(id || ''),
    enabled: Boolean(id),
  })

  const { data: activeHolds = [] } = useQuery({
    queryKey: ['holds', { institutionId: fdr?.institutionId, status: 'ACTIVE' }],
    queryFn: () => api.holds.list({ institutionId: fdr?.institutionId, status: 'ACTIVE' }),
    enabled: Boolean(fdr?.institutionId),
  })

  const { data: precheckData, isLoading: isPrecheckLoading } = useQuery({
    queryKey: ['fdr-precheck', id],
    queryFn: () => (id ? api.fdrs.getPrecheck(id) : null),
    enabled: Boolean(id),
  })

  const bankVerifyMutation = useMutation({
    mutationFn: () => api.fdrs.bankVerify(id!, { simulate: true }),
    onSuccess: () => {
      toast({
        title: 'Bank verification complete',
        description: 'Verified with SFMS adapter. Trust updated to Bank Confirmed.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Bank verification failed',
        description: err.message,
        type: 'danger',
      })
    },
  })

  // Submit mutation (institution submits for verification)
  const submitMutation = useMutation({
    mutationFn: (fdrId: string) => api.fdrs.submit(fdrId),
    onSuccess: (updated) => {
      toast({
        title: 'Submitted for verification',
        description: `Instrument ${updated.fdrNumber} submitted. Risk evaluated as ${updated.riskLevel || 'LOW'}.`,
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
    },
    onError: (err: any) => {
      toast({
        title: 'Submission blocked',
        description: err.message,
        type: 'error',
      })
    },
  })

  // Verify mutation (reviewer decision)
  const verifyMutation = useMutation({
    mutationFn: () =>
      api.fdrs.verify(id!, {
        result: verifyResult,
        remarks: verifyRemarks,
      }),
    onSuccess: (updated) => {
      toast({
        title: 'Decision recorded',
        description: `Instrument ${updated.fdrNumber} verified as '${verifyResult}'.`,
        type: 'success',
      })
      setVerifyModalOpen(false)
      setVerifyRemarks('')
      queryClient.invalidateQueries({ queryKey: ['fdr', id] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
    },
    onError: (err: any) => {
      setVerifyError(err.message)
    },
  })

  // Renewal mutation
  const renewalMutation = useMutation({
    mutationFn: () =>
      api.renewals.create(id!, {
        type: renewalType,
        justification: renewalJustification,
      }),
    onSuccess: () => {
      toast({
        title: 'Renewal petition filed',
        description: `Formal ${renewalType} request filed for regulatory sanction.`,
        type: 'success',
      })
      setRenewalModalOpen(false)
      setRenewalJustification('')
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
      navigate('/renewals')
    },
    onError: (err: any) => {
      setRenewalError(err.message)
    },
  })

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: () =>
      api.releases.create(id!, {
        reasonForRelease: releaseReason,
      }),
    onSuccess: () => {
      toast({
        title: 'Release request filed',
        description: 'Statutory relinquishment petition submitted.',
        type: 'success',
      })
      setReleaseModalOpen(false)
      setReleaseReason('')
      queryClient.invalidateQueries({ queryKey: ['releases'] })
      navigate('/releases')
    },
    onError: (err: any) => {
      setReleaseError(err.message)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !fdr) {
    return (
      <ErrorState
        title="Instrument not found"
        message={`The Fixed Deposit Receipt record "${id}" does not exist in the registry or you lack permission to view it.`}
        onRetry={() => navigate('/fdrs')}
      />
    )
  }

  const isReviewer = user?.role === 'REVIEWER' || user?.role === 'ADMIN' || user?.role === 'AICTE_ADMIN' || user?.role === 'APPROVER'
  const isInstitutionUser = user?.role === 'INSTITUTION_USER'
  const isDraftOrDiscrepancy = fdr.verificationStatus === 'DRAFT' || fdr.verificationStatus === 'DISCREPANCY'
  const canVerify = (user?.role === 'REVIEWER' || user?.role === 'ADMIN') && (fdr.verificationStatus === 'SUBMITTED' || fdr.verificationStatus === 'UNDER_REVIEW')
  const hasActiveHold = activeHolds.length > 0
  const flagsList = fdr.flags || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="compact"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/fdrs')}
        >
          Back to FDR registry
        </Button>
      </div>

      <PageHeader
        title={fdr.fdrNumber}
        description={`${fdr.institutionName} • ${fdr.bankName} (${fdr.branchName})`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge
              level={fdr.trustLevel || (fdr.verificationStatus === 'VERIFIED' ? 'STAFF_VERIFIED' : 'SUBMITTED')}
              isSimulated={fdr.isSimulated || false}
            />
            <LienBadge
              status={fdr.lienStatus || (fdr.lienMarked ? 'CONFIRMED' : 'NOT_MARKED')}
              referenceNumber={fdr.lienReferenceNumber}
            />
            <CountdownChip maturityDate={fdr.maturityDate} />

            {/* Institution Action: Submit when DRAFT or DISCREPANCY */}
            {isInstitutionUser && isDraftOrDiscrepancy && (
              <Button
                variant="primary"
                size="default"
                leftIcon={<Send className="w-4 h-4" />}
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate(fdr.id)}
              >
                Submit for verification
              </Button>
            )}

            {/* Reviewer Action: Bank Check Simulation */}
            {isReviewer && (
              <Button
                variant="secondary"
                size="default"
                loading={bankVerifyMutation.isPending}
                onClick={() => bankVerifyMutation.mutate()}
                leftIcon={<Landmark className="w-4 h-4 text-ink-700" />}
                title="Query bank API / SFMS gateway (Sandbox simulator)"
              >
                Run bank check
              </Button>
            )}

            {/* Reviewer Action: Verify Dialog */}
            {canVerify && (
              <Button
                variant="primary"
                size="default"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => {
                  setVerifyError(null)
                  setVerifyModalOpen(true)
                }}
              >
                Execute verification
              </Button>
            )}

            {/* Institution Actions: Renewal & Release */}
            {isInstitutionUser && (fdr.lifecycleStatus === 'ACTIVE' || fdr.lifecycleStatus === 'EXPIRING' || fdr.lifecycleStatus === 'Active' || fdr.lifecycleStatus === 'Maturing soon') && (
              <>
                <Button
                  variant="secondary"
                  size="default"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => {
                    setRenewalError(null)
                    setRenewalModalOpen(true)
                  }}
                >
                  Request renewal
                </Button>
                <Button
                  variant="secondary"
                  size="default"
                  disabled={hasActiveHold}
                  leftIcon={hasActiveHold ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4" />}
                  onClick={() => {
                    if (hasActiveHold) return
                    setReleaseError(null)
                    setReleaseModalOpen(true)
                  }}
                  title={hasActiveHold ? `Release blocked by hold: ${activeHolds[0]?.reason}` : undefined}
                >
                  {hasActiveHold ? 'Release locked (Hold active)' : 'Request release'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Regulatory Hold Lock Banner */}
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
              {activeHolds[0].referenceNumber && (
                <span className="font-mono text-[11px] text-rose-800">
                  Ref: {activeHolds[0].referenceNumber}
                </span>
              )}
            </div>
            <p className="text-rose-800 mt-1">
              <strong>Grounds:</strong> {activeHolds[0].reason}
            </p>
          </div>
        </div>
      )}

      {/* Linked Successor / Predecessor Instrument Banner */}
      {fdr.replacementFdrId && (
        <div className="p-3 bg-surface border border-line rounded-md flex items-center justify-between text-xs text-ink-900">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-ink-500 shrink-0" />
            <span>
              This instrument was statutory replaced/renewed by successor instrument{' '}
              <strong className="font-mono">{fdr.replacementFdrId}</strong>.
            </span>
          </div>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => navigate(`/fdrs/${fdr.replacementFdrId}`)}
          >
            Inspect linked instrument
          </Button>
        </div>
      )}

      {fdr.previousFdrId && (
        <div className="p-3 bg-surface border border-line rounded-md flex items-center justify-between text-xs text-ink-900">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-ink-500 shrink-0" />
            <span>
              This instrument is a continuation for predecessor instrument{' '}
              <strong className="font-mono">{fdr.previousFdrId}</strong>.
            </span>
          </div>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => navigate(`/fdrs/${fdr.previousFdrId}`)}
          >
            Inspect preceding instrument
          </Button>
        </div>
      )}

      {/* Discrepancy Flags Box */}
      {flagsList.length > 0 && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Statutory discrepancy risk assessment</span>
            </div>
            <Badge status={fdr.riskLevel || 'HIGH'} />
          </div>
          <ul className="list-disc pl-5 space-y-0.5 font-mono text-[11px] text-amber-900">
            {flagsList.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Instrument & Documents' },
          { id: 'precheck', label: 'Pre-Submission Audit' },
          { id: 'timeline', label: 'Workflow & Dossier' },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* TAB 1: OVERVIEW & DOCUMENTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-ink-700" />
                  <span>Deposit & banking parameters</span>
                </h2>
                <InstrumentSourceBadge
                  source={fdr.verificationSource}
                  verificationStatus={fdr.verificationStatus}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-ink-500 block text-[11px]">Principal deposit value</span>
                  <span className="text-xl font-medium font-mono text-ink-900 tabular-nums">
                    ₹{formatCurrency(Number(fdr.depositAmount || fdr.amount) || 0)}
                  </span>
                </div>

                <div>
                  <span className="text-ink-500 block text-[11px]">Annual interest yield</span>
                  <span className="text-sm font-medium font-mono text-ink-900 tabular-nums">
                    {fdr.interestRate}% p.a.
                  </span>
                </div>

                <div>
                  <span className="text-ink-500 block text-[11px]">Commercial bank</span>
                  <span className="font-medium text-ink-900">{fdr.bankName}</span>
                  <span className="text-[11px] text-ink-500 block">Branch: {fdr.branchName}</span>
                </div>

                <div>
                  <span className="text-ink-500 block text-[11px]">Account & IFSC</span>
                  <span className="font-mono font-medium text-ink-900 block tabular-nums">
                    A/C: {fdr.accountNumber}
                  </span>
                  <span className="font-mono text-[11px] text-ink-500 tabular-nums">IFSC: {fdr.ifscCode}</span>
                </div>

                <div>
                  <span className="text-ink-500 block text-[11px]">Issue date</span>
                  <span className="font-mono text-ink-900 tabular-nums">{formatDate(fdr.issueDate)}</span>
                </div>

                <div>
                  <span className="text-ink-500 block text-[11px]">Maturity date</span>
                  <span className="font-mono text-ink-900 tabular-nums">{formatDate(fdr.maturityDate)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${fdr.jointAccount ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span className="text-ink-700">Joint account with Member Secretary AICTE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${fdr.lienMarked ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                  <span className="text-ink-700">Lien endorsed in bank core records</span>
                </div>
              </div>
            </Card>

            {/* Document Docket */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink-700" />
                  <span>Encrypted statutory documents ({fdr.documents.length})</span>
                </h2>

                {isInstitutionUser && (
                  <Button
                    variant="secondary"
                    size="compact"
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => setUploadModalOpen(true)}
                  >
                    Attach file
                  </Button>
                )}
              </div>

              {fdr.documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-500 bg-canvas rounded-md border border-dashed border-line">
                  No supporting documents attached. Upload certificate scan to complete submission.
                </div>
              ) : (
                <div className="space-y-2">
                  {fdr.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-surface border border-line rounded-md text-xs hover:bg-canvas/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-ink-700 shrink-0" />
                        <div>
                          <span className="font-medium text-ink-900 block">{doc.fileName}</span>
                          <span className="text-[11px] text-ink-500">
                            {doc.category} {doc.version ? `• v${doc.version}` : ''} • {(doc.fileSize / 1024).toFixed(0)} KB • Encrypted (AES-256)
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="compact"
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => api.fdrs.downloadDocument(doc.id, doc.fileName)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
                <Building2 className="w-4 h-4 text-ink-700" />
                <span>Holder institution</span>
              </h3>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-ink-500 block text-[11px]">Institution name</span>
                  <Link
                    to={`/institutions/${fdr.institutionId}`}
                    className="font-medium text-ink-900 hover:text-accent-primary hover:underline block"
                  >
                    {fdr.institutionName}
                  </Link>
                </div>
                <div>
                  <span className="text-ink-500 block text-[11px]">Verification source trail</span>
                  <InstrumentSourceBadge
                    source={fdr.verificationSource}
                    verificationStatus={fdr.verificationStatus}
                  />
                </div>
                {fdr.reviewComments && (
                  <div className="p-2.5 bg-canvas rounded-md border border-line mt-2">
                    <span className="text-[10px] font-semibold text-ink-500 block">Latest review remarks</span>
                    <p className="text-xs text-ink-800 mt-0.5">{fdr.reviewComments}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PRE-SUBMISSION AUDIT */}
      {activeTab === 'precheck' && (
        <PreSubmissionCheckTable
          precheck={precheckData || null}
          isLoading={isPrecheckLoading}
          readOnly
        />
      )}

      {/* TAB 3: WORKFLOW & DOSSIER */}
      {activeTab === 'timeline' && (
        <div className="max-w-2xl">
          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-700" />
              <span>Compliance workflow timeline</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
              {(fdr.verificationTimeline || []).map((tl, index) => (
                <div key={tl.id || index} className="relative text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-ink-900 border-2 border-surface" />
                  <div className="font-medium text-ink-900 leading-snug">{tl.title}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5 font-mono tabular-nums">
                    {formatDateTime(tl.timestamp)} • {tl.actor} ({tl.role})
                  </div>
                  {tl.notes && (
                    <p className="mt-1 text-xs text-ink-700 bg-canvas p-2.5 rounded-md border border-line">
                      {tl.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Verify Decision Dialog (Reviewer/Admin) */}
      <Dialog
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Execute regulatory verification"
        description="Record regional officer scrutiny decision and audit remarks."
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={verifyMutation.isPending}
              disabled={!verifyRemarks.trim()}
              onClick={() => verifyMutation.mutate()}
            >
              Confirm decision
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {verifyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs">
              {verifyError}
            </div>
          )}

          <div>
            <label className="font-medium text-ink-900 block mb-1.5">Scrutiny determination:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVerifyResult('VERIFIED')}
                className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                  verifyResult === 'VERIFIED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-surface border-line text-ink-700 hover:bg-canvas'
                }`}
              >
                Verified
              </button>
              <button
                type="button"
                onClick={() => setVerifyResult('DISCREPANCY')}
                className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                  verifyResult === 'DISCREPANCY'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-500'
                    : 'bg-surface border-line text-ink-700 hover:bg-canvas'
                }`}
              >
                Discrepancy
              </button>
              <button
                type="button"
                onClick={() => setVerifyResult('REJECTED')}
                className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                  verifyResult === 'REJECTED'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-500'
                    : 'bg-surface border-line text-ink-700 hover:bg-canvas'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          <div>
            <label className="font-medium text-ink-900 block mb-1.5">
              Audit remarks / findings <span className="text-danger">*</span>
            </label>
            <textarea
              value={verifyRemarks}
              onChange={(e) => setVerifyRemarks(e.target.value)}
              placeholder="Enter detailed audit observations, mandate checks, or discrepancy reasons..."
              rows={4}
              className="w-full p-2.5 border border-line rounded-md text-xs text-ink-900 bg-surface focus:outline-none focus:border-ink-900"
            />
          </div>
        </div>
      </Dialog>

      {/* Renewal Request Dialog */}
      <Dialog
        open={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        title="Request instrument renewal or replacement"
        description="File a formal petition to renew or replace this statutory deposit."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={renewalMutation.isPending}
              onClick={() => renewalMutation.mutate()}
            >
              Submit petition
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {renewalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs">
              {renewalError}
            </div>
          )}

          <div>
            <label className="font-medium text-ink-900 block mb-1.5">Petition type:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRenewalType('RENEWAL')}
                className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                  renewalType === 'RENEWAL'
                    ? 'bg-accent-subtle border-accent-primary text-accent-primary'
                    : 'bg-surface border-line text-ink-700 hover:bg-canvas'
                }`}
              >
                Renewal (Same bank)
              </button>
              <button
                type="button"
                onClick={() => setRenewalType('REPLACEMENT')}
                className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                  renewalType === 'REPLACEMENT'
                    ? 'bg-accent-subtle border-accent-primary text-accent-primary'
                    : 'bg-surface border-line text-ink-700 hover:bg-canvas'
                }`}
              >
                Replacement (Bank transfer)
              </button>
            </div>
          </div>

          <div>
            <label className="font-medium text-ink-900 block mb-1.5">Justification / reason:</label>
            <textarea
              value={renewalJustification}
              onChange={(e) => setRenewalJustification(e.target.value)}
              placeholder="e.g. 5-year lock-in tenure extension under AICTE regulations..."
              rows={3}
              className="w-full p-2.5 border border-line rounded-md text-xs text-ink-900 bg-surface focus:outline-none focus:border-ink-900"
            />
          </div>
        </div>
      </Dialog>

      {/* Release Request Dialog */}
      <Dialog
        open={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Request statutory deposit release"
        description="Petition for the release and refund of this deposit following completion of statutory tenure."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReleaseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={releaseMutation.isPending}
              onClick={() => releaseMutation.mutate()}
            >
              Submit release petition
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {releaseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs">
              {releaseError}
            </div>
          )}

          <div className="p-3 bg-canvas border border-line rounded-md text-ink-700">
            <strong>Eligibility conditions:</strong>
            <ul className="list-disc pl-4 mt-1 text-[11px] space-y-0.5">
              <li>Instrument must be in Verified status.</li>
              <li>No open regulatory discrepancies.</li>
              <li>Requires 2-tier approval (Reviewer followed by Approver).</li>
            </ul>
          </div>

          <div>
            <label className="font-medium text-ink-900 block mb-1.5">Reason for relinquishment:</label>
            <textarea
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="e.g. Completion of mandatory 10-year lock-in period with full statutory compliance..."
              rows={3}
              className="w-full p-2.5 border border-line rounded-md text-xs text-ink-900 bg-surface focus:outline-none focus:border-ink-900"
            />
          </div>
        </div>
      </Dialog>

      {/* Upload Additional Document Dialog */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Attach statutory document"
        description="Upload signed certificate scan or bank lien mandate letter (AES-256 encrypted)."
      >
        <div className="space-y-4">
          <FileDropzone
            category="FDR Certificate"
            onFileSelected={async (file) => {
              try {
                await api.fdrs.uploadDocument(fdr.id, file, 'FDR_CERTIFICATE')
                toast({
                  title: 'Document uploaded',
                  description: `${file.name} successfully encrypted and attached.`,
                  type: 'success',
                })
                setUploadModalOpen(false)
                queryClient.invalidateQueries({ queryKey: ['fdr', id] })
              } catch (err: any) {
                toast({
                  title: 'Upload failed',
                  description: err.message,
                  type: 'error',
                })
              }
            }}
          />
        </div>
      </Dialog>
    </div>
  )
}
