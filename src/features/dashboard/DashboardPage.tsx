import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Unlock,
  ShieldAlert,
  ArrowRight,
  Activity,
  PlayCircle,
  CheckCheck,
  Download,
  AlertOctagon,
  FileWarning,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabItem } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate, formatINR } from '@/lib/format'
import { KPICard } from '@/components/ui/KPICard'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/feedback/Toast'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'
import { cn } from '@/lib/utils'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [adminNotice, setAdminNotice] = useState<string | null>(null)
  const [exportingStatus, setExportingStatus] = useState<string | null>(null)

  const [drilldownModal, setDrilldownModal] = useState<{
    open: boolean
    title: string
    subtitle: string
    metric:
      | 'trust-level'
      | 'expiry-band'
      | 'stuck-stages'
      | 'missing-documents'
      | 'active-holds'
      | 'unconfirmed-liens'
    params?: Record<string, string>
  }>({
    open: false,
    title: '',
    subtitle: '',
    metric: 'trust-level',
  })

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.dashboard.getSummary(),
    refetchInterval: 30000,
  })

  const { data: drilldownData, isLoading: drilldownLoading } = useQuery({
    queryKey: ['drilldown', drilldownModal.metric, drilldownModal.params],
    queryFn: () => api.dashboard.getDrilldown(drilldownModal.metric, drilldownModal.params),
    enabled: drilldownModal.open,
  })

  const handleExportCsv = async (params: any, label: string) => {
    setExportingStatus(label)
    try {
      await api.reports.downloadCsv(params)
      toast({
        title: 'Report Downloaded',
        description: `${label} export generated with digital audit watermark.`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Unable to generate CSV report.',
        type: 'danger',
      })
    } finally {
      setExportingStatus(null)
    }
  }

  const runMaturityMutation = useMutation({
    mutationFn: () => api.admin.runMaturityCheck(),
    onSuccess: (data) => {
      setAdminNotice(
        `Maturity & SLA check complete: ${data.stats.instrumentsChecked} instruments evaluated, ${data.stats.remindersGenerated} reminders generated, ${data.stats.maturedCount} marked matured, ${data.stats.escalationsCount} escalated.`
      )
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
    },
    onError: (err: any) => {
      setAdminNotice(`Error executing maturity check: ${err.message}`)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="p-8 text-center rounded-xl bg-white border border-rose-200 text-rose-900 shadow-level-1">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold">Failed to load compliance dashboard metrics</h3>
        <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
          {error instanceof Error ? error.message : 'Network failure communicating with AICTE backend.'}
        </p>
        <Button variant="outline" size="compact" className="mt-4" onClick={() => refetch()}>
          Retry Query
        </Button>
      </div>
    )
  }

  const {
    countsByLifecycle,
    pendingVerifications,
    overdueCases,
    expiringIn30Days,
    pendingRenewalRequests,
    pendingReleaseRequests,
    metrics,
    priorityQueue,
  } = summary

  const DASHBOARD_TABS: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'priority', label: 'Priority Queue', badge: priorityQueue.length },
    { id: 'sla', label: 'SLA Metrics' },
    { id: 'discrepancies', label: 'Discrepancies', badge: metrics.discrepanciesFlaggedCount },
    { id: 'exports', label: 'Reports & Export' },
  ]

  // Role title definition
  const pageTitle =
    user?.role === 'INSTITUTION_USER'
      ? `${user.institutionName || 'Institution'} Deposit Docket`
      : user?.role === 'REVIEWER'
      ? 'Regional Scrutiny & Verification Desk'
      : user?.role === 'APPROVER'
      ? 'Director Approval & Sanction Desk'
      : 'National Central Oversight & Administration'

  const pageSubtitle = `Official compliance dashboard for ${user?.name || 'Authorized Official'} (${user?.designation || user?.role || 'Officer'})`

  return (
    <div className="space-y-5">
      {/* Quiet Header with contextual primary action */}
      <PageHeader
        title={pageTitle}
        description={pageSubtitle}
        action={
          <div className="flex items-center gap-2">
            {user?.role === 'INSTITUTION_USER' && (
              <Link to="/fdrs/new">
                <Button variant="primary" size="default">
                  Register New Instrument
                </Button>
              </Link>
            )}

            {user?.role === 'REVIEWER' && (
              <Link to="/verification">
                <Button variant="primary" size="default">
                  Open Scrutiny Queue ({pendingVerifications})
                </Button>
              </Link>
            )}

            {user?.role === 'APPROVER' && (
              <Link to="/renewals">
                <Button variant="primary" size="default">
                  Review Pending Renewals ({pendingRenewalRequests})
                </Button>
              </Link>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'AICTE_ADMIN') && (
              <Button
                variant="primary"
                size="default"
                loading={runMaturityMutation.isPending}
                onClick={() => runMaturityMutation.mutate()}
                leftIcon={<PlayCircle className="w-4 h-4" />}
              >
                Run Maturity & SLA Check
              </Button>
            )}
          </div>
        }
      />

      {/* Admin Notice on execution */}
      {adminNotice && (
        <div className="p-3 rounded-lg bg-slate-900 text-white text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-brand-lime shrink-0" />
            <span>{adminNotice}</span>
          </div>
          <button
            onClick={() => setAdminNotice(null)}
            className="text-slate-300 text-xs font-semibold hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation with Animated Indicator */}
      <Tabs
        tabs={DASHBOARD_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6 fade-in-settle">
          {/* Top 6 Statutory Lifecycle Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              title="Active deposits"
              value={countsByLifecycle.ACTIVE}
              subtext="In regulatory force"
              tone="success"
              icon={ShieldCheck}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Active Instruments Drill-Down',
                  subtitle: 'Statutory deposits currently held in force with commercial banks.',
                  metric: 'trust-level',
                  params: { level: 'ALL' },
                })
              }
            />

            <KPICard
              title="Expiring in 30 days"
              value={expiringIn30Days}
              subtext="Renewal notice due"
              tone="warning"
              icon={Clock}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Expiring Within 30 Days',
                  subtitle: 'Deposits approaching maturity requiring immediate renewal petition.',
                  metric: 'expiry-band',
                  params: { band: 'days30' },
                })
              }
            />

            <KPICard
              title="Overdue matured"
              value={overdueCases}
              subtext="Immediate escalation"
              tone="danger"
              icon={AlertTriangle}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Overdue Matured Deposits',
                  subtitle: 'Instruments past maturity requiring regulatory claim or renewal.',
                  metric: 'expiry-band',
                  params: { band: 'pastMaturity' },
                })
              }
            />

            <KPICard
              title="Pending verification"
              value={pendingVerifications}
              subtext="In scrutiny queue"
              tone="info"
              icon={FileCheck2}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Pending Regional Verification',
                  subtitle: 'New deposit filings submitted and awaiting scrutiny by regional officers.',
                  metric: 'trust-level',
                  params: { level: 'SUBMITTED' },
                })
              }
            />

            <KPICard
              title="Renewals pending"
              value={pendingRenewalRequests}
              subtext="Sanction bureau"
              tone="default"
              icon={RefreshCw}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Pending Renewal Petitions',
                  subtitle: 'Institution renewal filings awaiting consensus approval.',
                  metric: 'stuck-stages',
                })
              }
            />

            <KPICard
              title="Release requests"
              value={pendingReleaseRequests}
              subtext="5-Office consensus"
              tone="default"
              icon={Unlock}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Release & Relinquishment Desk',
                  subtitle: 'Security deposit release petitions undergoing 5-stage council scrutiny.',
                  metric: 'stuck-stages',
                })
              }
            />
          </div>

          {/* Compact Attention Strip */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-level-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 mr-2">System Status:</span>
                <span className="text-slate-600">
                  Real-time SFMS synchronization active. {metrics.remindersGeneratedCount} statutory reminders queued.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('priority')}
                className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>Inspect Priority Queue ({priorityQueue.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Role Navigation Quick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              to="/fdrs"
              className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-level-2 hover:-translate-y-[1px] transition-all duration-fast group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-black">
                    FDR Instruments
                  </span>
                  <p className="text-[11px] text-slate-500">Registry search & tracking</p>
                </div>
              </div>
            </Link>

            <Link
              to="/renewals"
              className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-level-2 hover:-translate-y-[1px] transition-all duration-fast group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-black">
                    Renewals & Transfer
                  </span>
                  <p className="text-[11px] text-slate-500">Extension petitions</p>
                </div>
              </div>
            </Link>

            <Link
              to="/releases"
              className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-level-2 hover:-translate-y-[1px] transition-all duration-fast group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-black">
                    Release & Refund
                  </span>
                  <p className="text-[11px] text-slate-500">5-office consensus desk</p>
                </div>
              </div>
            </Link>

            <Link
              to="/holds"
              className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-level-2 hover:-translate-y-[1px] transition-all duration-fast group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 group-hover:text-black">
                    Regulatory Holds
                  </span>
                  <p className="text-[11px] text-slate-500">Legal injunctions & locks</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Priority Queue */}
      {activeTab === 'priority' && (
        <div className="space-y-4 fade-in-settle">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-level-1 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Statutory Priority Action Queue
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top instruments requiring scrutiny, renewal, or discrepancy resolution
                </p>
              </div>
              <Link
                to="/fdrs"
                className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>View all FDRs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {priorityQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No priority issues pending in the queue. All instruments comply with current statutory schedules.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                    <tr>
                      <th className="py-2.5 px-4">Reference / FDR No.</th>
                      <th className="py-2.5 px-4">Institution</th>
                      <th className="py-2.5 px-4">Bank</th>
                      <th className="py-2.5 px-4">Deposit Amount</th>
                      <th className="py-2.5 px-4">Maturity & SLA</th>
                      <th className="py-2.5 px-4">Trust Level</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {priorityQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          <Link to={`/fdrs/${item.id}`} className="hover:underline">
                            {item.fdrNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-800 max-w-[200px] truncate" title={item.institutionName}>
                          {item.institutionName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.bankName}</td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-slate-900">
                          ₹{formatCurrency(Number(item.amount) || 0)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          <div className="space-y-1">
                            <span className="tabular-nums text-xs font-medium block">
                              {formatDate(item.maturityDate)}
                            </span>
                            <CountdownChip maturityDate={item.maturityDate} />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <TrustBadge
                            level={
                              (item as any).trustLevel ||
                              (item.verificationStatus === 'VERIFIED' ? 'STAFF_VERIFIED' : 'SUBMITTED')
                            }
                            isSimulated={(item as any).isSimulated}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge status={item.verificationStatus} />
                            <Badge status={item.lifecycleStatus} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/fdrs/${item.id}`}
                            className="text-xs font-semibold text-slate-900 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: SLA Metrics */}
      {activeTab === 'sla' && (
        <div className="space-y-4 fade-in-settle">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard
              title="Avg verification time"
              value={`${metrics.avgVerificationHours} hrs`}
              subtext="Submitted to first decision"
              tone="default"
              icon={Clock}
            />

            <KPICard
              title="Active discrepancies"
              value={metrics.discrepanciesFlaggedCount}
              subtext="Regulatory holds in force"
              tone="danger"
              icon={ShieldAlert}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Institutions Under Regulatory Hold',
                  subtitle: 'Active holds prohibiting deposit release or financial closure.',
                  metric: 'active-holds',
                })
              }
            />

            <KPICard
              title="Reminders dispatched"
              value={metrics.remindersGeneratedCount}
              subtext="Automated statutory notices"
              tone="info"
              icon={TrendingUp}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Maturity Alert Bands (60-90 Days)',
                  subtitle: 'Upcoming maturity notices queued for automated notification.',
                  metric: 'expiry-band',
                  params: { band: 'days60' },
                })
              }
            />

            <KPICard
              title="Cases beyond SLA (>3d)"
              value={metrics.casesPendingBeyondSla}
              subtext="Escalated to bureau"
              tone="warning"
              icon={AlertOctagon}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Consensus Stages Exceeding SLA',
                  subtitle: 'Inter-office consensus stages pending beyond the statutory threshold.',
                  metric: 'stuck-stages',
                })
              }
            />

            <KPICard
              title="Missing documents"
              value={metrics.totalDocumentsMissing}
              subtext="Missing statutory scans"
              tone="danger"
              icon={FileWarning}
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Instruments Missing Statutory Documents',
                  subtitle: 'Active deposits lacking uploaded bank deposit receipts or lien letters.',
                  metric: 'missing-documents',
                })
              }
            />
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-level-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Statutory SLA Performance Standards
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All filings are evaluated against statutory benchmarks approved by AICTE Executive Committee.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block">Scrutiny Desk SLA</span>
                <span className="text-slate-500 block mt-0.5">Target: ≤ 24.0 hours from submission</span>
                <span className="text-[11px] font-medium text-emerald-700 mt-1.5 block">
                  Current Average: {metrics.avgVerificationHours} hrs (Compliant)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block">Renewal Petition Review</span>
                <span className="text-slate-500 block mt-0.5">Target: ≤ 48.0 hours from petition</span>
                <span className="text-[11px] font-medium text-emerald-700 mt-1.5 block">
                  Active Queue: {pendingRenewalRequests} cases
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-900 block">Release Sanction Consensus</span>
                <span className="text-slate-500 block mt-0.5">Target: ≤ 72.0 hours total across 5 offices</span>
                <span className="text-[11px] font-medium text-amber-700 mt-1.5 block">
                  Beyond Threshold: {metrics.casesPendingBeyondSla} cases
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discrepancies */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-4 fade-in-settle">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-level-1 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Active Regulatory Discrepancies & Injunctions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Instruments or institutions currently flagged requiring corrective compliance action
              </p>
            </div>
            <Button
              variant="outline"
              size="compact"
              onClick={() =>
                setDrilldownModal({
                  open: true,
                  title: 'Institutions Under Regulatory Hold',
                  subtitle: 'Active holds prohibiting deposit release or financial closure.',
                  metric: 'active-holds',
                })
              }
            >
              Inspect Active Holds ({metrics.discrepanciesFlaggedCount})
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-level-1 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-200 p-3 rounded-lg mb-4">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {metrics.discrepanciesFlaggedCount} institutions have active regulatory holds or unresolved document discrepancies.
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When an instrument is flagged for discrepancy (e.g. non-conforming lock-in period, missing bank confirmation, or vigilance inquiry), automated hold enforcement prevents financial release until approved by the Regional Bureau.
            </p>
          </div>
        </div>
      )}

      {/* Tab 5: Exports */}
      {activeTab === 'exports' && (
        <div className="space-y-4 fade-in-settle">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-level-1 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Statutory Audit & Regulatory Export
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate immediate, cryptographically watermarked CSV reports for compliance reviews.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">Active FDRs Report</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    All technical security deposits currently in regulatory force.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  className="mt-4 w-full justify-center"
                  loading={exportingStatus === 'Active'}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleExportCsv({ status: 'ACTIVE' }, 'Active')}
                >
                  Export Active FDRs
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">Expiring & Matured</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deposits reaching maturity or requiring renewal petition.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  className="mt-4 w-full justify-center"
                  loading={exportingStatus === 'Matured'}
                  leftIcon={<Download className="w-3.5 h-3.5 text-amber-600" />}
                  onClick={() => handleExportCsv({ status: 'MATURED' }, 'Matured')}
                >
                  Export Expiring / Matured
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">Discrepancies & Holds</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Flagged instruments under scrutiny or legal hold.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  className="mt-4 w-full justify-center"
                  loading={exportingStatus === 'Discrepancy'}
                  leftIcon={<Download className="w-3.5 h-3.5 text-rose-600" />}
                  onClick={() => handleExportCsv({ status: 'DISCREPANCY' }, 'Discrepancy')}
                >
                  Export Discrepancies
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Note: All exported spreadsheets include official AICTE regulatory watermarks and timestamped digital signatures for statutory audit admissibility.
            </p>
          </div>
        </div>
      )}

      {/* KPI Drill-Down Modal */}
      <Dialog
        open={drilldownModal.open}
        onClose={() => setDrilldownModal({ ...drilldownModal, open: false })}
        title={drilldownModal.title}
        description={drilldownModal.subtitle}
        maxWidth="xl"
        footer={
          <Button variant="secondary" onClick={() => setDrilldownModal({ ...drilldownModal, open: false })}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {drilldownLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <span className="font-semibold text-slate-900">
                  Total Matching Records: {drilldownData?.total ?? 0}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  /dashboard/drilldown/{drilldownModal.metric}
                </span>
              </div>

              {/* Dynamic Table by Metric */}
              <div className="overflow-x-auto max-h-96 border border-slate-200/90 rounded-xl bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold sticky top-0">
                    <tr>
                      {drilldownModal.metric === 'stuck-stages' ? (
                        <>
                          <th className="py-2.5 px-3">FDR No.</th>
                          <th className="py-2.5 px-3">Institution</th>
                          <th className="py-2.5 px-3">Bureau / Office</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Overdue Days</th>
                          <th className="py-2.5 px-3">Amount</th>
                        </>
                      ) : drilldownModal.metric === 'active-holds' ? (
                        <>
                          <th className="py-2.5 px-3">Inst. Code</th>
                          <th className="py-2.5 px-3">Institution Name</th>
                          <th className="py-2.5 px-3">Source Body</th>
                          <th className="py-2.5 px-3">Hold Reason</th>
                          <th className="py-2.5 px-3">Reference No.</th>
                          <th className="py-2.5 px-3">Placed Date</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">Reference No.</th>
                          <th className="py-2.5 px-3">Institution</th>
                          <th className="py-2.5 px-3">Bank Name</th>
                          <th className="py-2.5 px-3">Deposit Amount</th>
                          <th className="py-2.5 px-3">Status / Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {drilldownModal.metric === 'stuck-stages' &&
                      (drilldownData?.stages || []).map((stage: any) => (
                        <tr key={stage.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{stage.fdrNumber}</td>
                          <td className="py-2.5 px-3 text-slate-800">{stage.institutionName}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full text-[10px]">
                              {stage.office}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 tabular-nums">{stage.dueAt ? formatDate(stage.dueAt) : 'N/A'}</td>
                          <td className="py-2.5 px-3 tabular-nums font-semibold text-rose-600">+{stage.overdueDays} days</td>
                          <td className="py-2.5 px-3 tabular-nums font-semibold">{formatINR(Number(stage.amount) || 0)}</td>
                        </tr>
                      ))}

                    {drilldownModal.metric === 'active-holds' &&
                      (drilldownData?.holds || []).map((hold: any) => (
                        <tr key={hold.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{hold.institutionCode}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{hold.institutionName}</td>
                          <td className="py-2.5 px-3 font-semibold text-rose-700">{hold.sourceBody}</td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={hold.reason}>
                            {hold.reason}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{hold.referenceNo || 'None'}</td>
                          <td className="py-2.5 px-3 tabular-nums text-slate-500">{formatDate(hold.placedAt)}</td>
                        </tr>
                      ))}

                    {drilldownModal.metric !== 'stuck-stages' &&
                      drilldownModal.metric !== 'active-holds' &&
                      (drilldownData?.instruments || []).map((inst: any) => (
                        <tr key={inst.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{inst.referenceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-800">{inst.institutionName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{inst.bankName}</td>
                          <td className="py-2.5 px-3 tabular-nums font-semibold text-slate-900">
                            {formatINR(Number(inst.depositAmount) || 0)}
                          </td>
                          <td className="py-2.5 px-3">
                            {inst.maturityDate ? (
                              <span className="tabular-nums">{formatDate(inst.maturityDate)}</span>
                            ) : inst.trustLevel ? (
                              <TrustBadge level={inst.trustLevel} isSimulated={inst.trustSimulated} />
                            ) : inst.lienStatus ? (
                              <span className="text-[11px] font-medium">{inst.lienStatus}</span>
                            ) : (
                              <Badge status={inst.verificationStatus || inst.lifecycleStatus} />
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              to={`/fdrs/${inst.id}`}
                              className="text-slate-900 hover:underline font-semibold"
                              onClick={() => setDrilldownModal({ ...drilldownModal, open: false })}
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      ))}

                    {(!drilldownData ||
                      (drilldownModal.metric === 'stuck-stages' && (drilldownData?.stages || []).length === 0) ||
                      (drilldownModal.metric === 'active-holds' && (drilldownData?.holds || []).length === 0) ||
                      (drilldownModal.metric !== 'stuck-stages' &&
                        drilldownModal.metric !== 'active-holds' &&
                        (drilldownData?.instruments || []).length === 0)) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No matching records for this statutory drilldown parameter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
