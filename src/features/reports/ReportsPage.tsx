import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  Filter,
  FileSpreadsheet,
  Printer,
  Landmark,
  Building,
  RotateCcw,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Badge, RiskBadge, InstrumentTypeBadge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate } from '@/lib/format'
import { useToast } from '@/components/feedback/Toast'

export const ReportsPage: React.FC = () => {
  const { toast } = useToast()
  
  // Tabs: all, pending-verification, upcoming-maturity, missing-documents, overdue
  const [activeTab, setActiveTab] = useState<
    'all' | 'pending-verification' | 'upcoming-maturity' | 'missing-documents' | 'overdue'
  >('all')

  // Filters
  const [selectedInstitution, setSelectedInstitution] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedBank, setSelectedBank] = useState('all')
  const [selectedInstrumentType, setSelectedInstrumentType] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Query institutions for filter dropdown
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  // Query report data from real backend endpoint GET /reports/fdrs
  const { data: reportResult, isLoading } = useQuery({
    queryKey: [
      'reports-fdrs',
      activeTab,
      selectedInstitution,
      selectedStatus,
      selectedBank,
      selectedInstrumentType,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      api.reports.getFdrs({
        type: activeTab,
        institution: selectedInstitution,
        status: selectedStatus,
        bank: selectedBank,
        instrumentType: selectedInstrumentType,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  })

  const records = reportResult?.data || []
  const totalCount = reportResult?.totalCount || records.length
  const totalCorpus = records.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)

  const handleDownloadCsv = async () => {
    try {
      setIsExporting(true)
      await api.reports.downloadCsv({
        type: activeTab,
        institution: selectedInstitution,
        status: selectedStatus,
        bank: selectedBank,
        instrumentType: selectedInstrumentType,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      toast({
        title: 'CSV exported',
        description: `Exported ${records.length} records.`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err.message || 'Unable to download CSV report.',
        type: 'danger',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetFilters = () => {
    setSelectedInstitution('all')
    setSelectedStatus('all')
    setSelectedBank('all')
    setSelectedInstrumentType('all')
    setFromDate('')
    setToDate('')
  }

  const columns: Column<any>[] = [
    {
      header: 'Instrument / FDR no.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-medium text-ink-900 text-xs tabular-nums">
              {item.fdrNumber}
            </span>
            <InstrumentTypeBadge type={item.instrumentType || 'FDR'} />
          </div>
          <div className="text-[11px] text-ink-500">
            {item.bankName} • {item.branchName || 'Main'}
          </div>
          <InstrumentSourceBadge />
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <div>
          <span className="font-medium text-ink-900 block truncate max-w-xs text-xs">
            {item.institutionName}
          </span>
          <span className="text-[11px] text-ink-500 font-mono tabular-nums">
            Code: {item.institutionCode || 'N/A'}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Corpus amount',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <div>
          <span className="font-mono font-medium text-ink-900 text-xs block tabular-nums">
            {formatINR(item.amount)}
          </span>
          {item.interestRate && (
            <span className="text-[10px] text-ink-500 font-mono tabular-nums">
              {item.interestRate}% p.a.
            </span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Maturity schedule',
      accessorKey: 'maturityDate',
      cell: (item) => (
        <div className="text-xs">
          <span className="font-mono text-ink-900 block tabular-nums">
            {formatDate(item.maturityDate)}
          </span>
          <span className="text-[10px] font-mono text-ink-500 tabular-nums">
            Issued: {formatDate(item.issueDate)}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'lifecycleStatus',
      cell: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge status={item.verificationStatus} />
          <Badge status={item.lifecycleStatus} />
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Risk',
      accessorKey: 'riskLevel',
      align: 'center',
      cell: (item) => <RiskBadge level={item.riskLevel || 'LOW'} />,
      sortable: true,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Exports"
        description="Filterable compliance statements, maturity schedules, missing documentation audits, and data exports."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="default"
              leftIcon={<Download className="w-4 h-4" />}
              loading={isExporting}
              onClick={handleDownloadCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'all', label: 'All Instruments' },
          { id: 'pending-verification', label: 'Pending Verification' },
          { id: 'upcoming-maturity', label: 'Upcoming Maturity (30 Days)' },
          { id: 'missing-documents', label: 'Missing Documents' },
          { id: 'overdue', label: 'Overdue Instruments' },
        ]}
      />

      {/* Filter Panel */}
      <Card className="space-y-3 p-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-900">
            <Filter className="w-3.5 h-3.5 text-ink-700" />
            <span>Filter criteria</span>
          </div>
          <Button
            variant="ghost"
            size="compact"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetFilters}
            className="text-xs text-ink-500 hover:text-ink-900"
          >
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 text-xs">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Institution
            </label>
            <Select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              options={[
                { value: 'all', label: 'All institutions' },
                ...institutions.map((inst) => ({
                  value: inst.id,
                  label: inst.name.length > 28 ? `${inst.name.slice(0, 28)}...` : inst.name,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Status
            </label>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'SUBMITTED', label: 'Submitted' },
                { value: 'UNDER_REVIEW', label: 'Under Review' },
                { value: 'VERIFIED', label: 'Verified' },
                { value: 'DISCREPANCY', label: 'Discrepancy' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'EXPIRING', label: 'Expiring Soon' },
                { value: 'MATURED', label: 'Matured' },
                { value: 'RENEWED', label: 'Renewed' },
                { value: 'RELEASED', label: 'Released' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Bank
            </label>
            <Select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              options={[
                { value: 'all', label: 'All banks' },
                { value: 'State Bank of India', label: 'State Bank of India' },
                { value: 'Punjab National Bank', label: 'Punjab National Bank' },
                { value: 'Canara Bank', label: 'Canara Bank' },
                { value: 'Bank of Baroda', label: 'Bank of Baroda' },
                { value: 'Union Bank of India', label: 'Union Bank of India' },
                { value: 'HDFC Bank', label: 'HDFC Bank' },
                { value: 'ICICI Bank', label: 'ICICI Bank' },
                { value: 'Axis Bank', label: 'Axis Bank' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Instrument type
            </label>
            <Select
              value={selectedInstrumentType}
              onChange={(e) => setSelectedInstrumentType(e.target.value)}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'FDR', label: 'FDR' },
                { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Maturity from
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-surface text-ink-900 border border-line rounded-md px-2.5 py-1.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Maturity to
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-surface text-ink-900 border border-line rounded-md px-2.5 py-1.5 text-xs focus:border-ink-900 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Matching instruments</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {totalCount}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-700">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Cumulative corpus</span>
            <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
              {formatINR(totalCorpus)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Landmark className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-ink-500 font-medium block">Report view</span>
            <span className="text-sm font-medium text-ink-900 truncate capitalize block mt-1">
              {activeTab.replace('-', ' ')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-700">
            <Building className="w-4 h-4" />
          </div>
        </Card>
      </div>

      {/* Report Records Table */}
      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(item) => item.fdrNumber}
        isLoading={isLoading}
        emptyMessage="No statutory instruments found matching criteria."
      />
    </div>
  )
}
