import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  FileSpreadsheet,
  FileCheck2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Download,
  Filter,
  ShieldAlert
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate, formatDateTime } from '@/lib/format'
import { FDRRecord, AuditRecord } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export const OfficialDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [regionFilter, setRegionFilter] = useState('all')

  const { data: fdrs = [], isLoading: fdrsLoading } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.audit.list(),
  })

  const { data: renewals = [] } = useQuery({
    queryKey: ['renewals'],
    queryFn: () => api.renewals.list(),
  })

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  })

  // Priority ordering: overdue and discrepancies first per Section 8 Module 4!
  const verificationQueue = React.useMemo(() => {
    return [...fdrs].sort((a, b) => {
      // Discrepancy flagged highest priority
      if (a.verificationStatus === 'Discrepancy flagged' && b.verificationStatus !== 'Discrepancy flagged')
        return -1
      if (b.verificationStatus === 'Discrepancy flagged' && a.verificationStatus !== 'Discrepancy flagged')
        return 1
      if (a.verificationStatus === 'Pending review' && b.verificationStatus !== 'Pending review')
        return -1
      if (b.verificationStatus === 'Pending review' && a.verificationStatus !== 'Pending review')
        return 1
      return 0
    })
  }, [fdrs])

  const totalRegistryCorpus = fdrs.reduce((acc, f) => acc + Number(f.amount || 0), 0)
  const pendingReviewCount = fdrs.filter((f) => f.verificationStatus === 'Pending review').length
  const flaggedDiscrepancyCount = fdrs.filter(
    (f) => f.verificationStatus === 'Discrepancy flagged'
  ).length
  const pendingRenewalsCount = renewals.filter((r) => r.requestStatus === 'Under review' || r.requestStatus === 'Submitted').length
  const pendingReleasesCount = releases.filter((r) => r.requestStatus === 'Under review' || r.requestStatus === 'Submitted').length

  // Bank breakdown data for chart
  const bankChartData = [
    { name: 'State Bank of India', value: 25000000, color: '#0f172a' },
    { name: 'Canara Bank', value: 12500000, color: '#1e293b' },
    { name: 'Punjab National Bank', value: 10000000, color: '#334155' },
    { name: 'Bank of Baroda', value: 10000000, color: '#475569' },
    { name: 'Other Scheduled Banks', value: 16500000, color: '#64748b' },
  ]

  const queueColumns: Column<FDRRecord>[] = [
    {
      header: 'FDR Number & Bank',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-900 font-mono block">{item.fdrNumber}</span>
          <span className="text-[11px] text-ink-500">{item.bankName}</span>
        </div>
      ),
    },
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <span className="font-medium text-ink-900 truncate max-w-xs block">
          {item.institutionName}
        </span>
      ),
    },
    {
      header: 'Deposit Amount',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <span className="font-mono font-semibold text-ink-900">{formatINR(Number(item.amount || 0))}</span>
      ),
    },
    {
      header: 'Verification Status',
      accessorKey: 'verificationStatus',
      cell: (item) => <Badge status={item.verificationStatus} />,
    },
    {
      header: 'Regulatory Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant={item.verificationStatus === 'Discrepancy flagged' ? 'danger' : 'primary'}
          size="compact"
          onClick={() => navigate(`/verification/${item.id}`)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          {item.verificationStatus === 'Pending review' ? 'Examine' : 'Review'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="AICTE Regulatory Oversight Dashboard"
        description="Bureau of Approval & Financial Compliance • Real-time fixed deposit security registry and verification operations."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              inputSize="default"
              aria-label="Filter jurisdiction"
            >
              <option value="all">All Regional Offices (HQ)</option>
              <option value="Northern">Northern Regional Office</option>
              <option value="Western">Western Regional Office</option>
              <option value="Southern">Southern Regional Office</option>
              <option value="South-Western">South-Western Regional Office</option>
            </Select>
            <Button
              variant="outline"
              size="default"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => navigate('/reports')}
            >
              Export Dossier
            </Button>
          </div>
        }
      />

      {/* Row of Summary Cards in Light Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Inscribed Corpus</span>
            <FileSpreadsheet className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-950 font-mono tabular-nums">
            {formatINR(totalRegistryCorpus)}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            Across {institutions.length} approved institutions
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Pending Verification</span>
            <FileCheck2 className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 font-mono tabular-nums">
            {pendingReviewCount}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            Awaiting bank SFMS or officer match
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Discrepancies Flagged</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-900 font-mono tabular-nums">
            {flaggedDiscrepancyCount}
          </div>
          <div className="mt-2 text-[11px] text-danger font-medium">
            Requires institution rectification
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Pending Decisions</span>
            <Clock className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-950 font-mono tabular-nums">
            {pendingRenewalsCount + pendingReleasesCount}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            {pendingRenewalsCount} renewals • {pendingReleasesCount} releases
          </div>
        </GlassSurface>
      </div>

      {/* Middle Layout: Bank Distribution Chart & Audit Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Priority Verification Queue (Overdue & Discrepancies First) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-navy-900" />
                <h2 className="text-sm font-semibold text-ink-900">
                  Priority Verification Queue (Discrepancies & Pending)
                </h2>
              </div>
              <Link
                to="/verification"
                className="text-xs text-navy-800 font-semibold hover:underline flex items-center gap-1"
              >
                <span>View all queues</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <DataTable
              columns={queueColumns}
              data={verificationQueue}
              keyExtractor={(item) => item.id}
              isLoading={fdrsLoading}
              onRowClick={(item) => navigate(`/verification/${item.id}`)}
            />
          </div>
        </div>

        {/* Right Column: Bank Distribution and Recent Audit Activity */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">
              Corpus Allocation by Scheduled Bank
            </h3>
            <p className="text-xs text-ink-500 mb-3">RBI Approved Commercial Banks</p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bankChartData}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {bankChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Deposit Corpus']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 mt-2 text-[11px]">
              {bankChartData.map((b) => (
                <div key={b.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-ink-700 truncate max-w-[140px]">{b.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-ink-900">{formatINR(b.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Audit Log Stream */}
          <Card>
            <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
              <h3 className="text-sm font-semibold text-ink-900">Recent Audit Actions</h3>
              <Link to="/audit" className="text-[11px] text-navy-800 hover:underline">
                Full log
              </Link>
            </div>
            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs border-b border-line/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
                    <span className="font-semibold text-navy-900">{log.actorName}</span>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-ink-700 text-[11px] leading-snug">{log.changeSummary}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
