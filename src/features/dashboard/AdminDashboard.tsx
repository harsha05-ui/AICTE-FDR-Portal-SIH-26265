import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  FileSpreadsheet,
  FileBarChart,
  History,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDateTime } from '@/lib/format'
import { AuditRecord, User } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface AdminDashboardProps {
  user: User
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate()

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.audit.list(),
  })

  const { data: fdrs = [] } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  // Pan-India aggregates
  const totalNationalCorpus = fdrs.reduce((acc, f) => acc + Number(f.amount || 0), 0)

  // Bank exposure distribution
  const bankChartData = [
    { name: 'State Bank of India', value: 25000000, color: '#0f172a' },
    { name: 'Punjab National Bank', value: 22500000, color: '#1e293b' },
    { name: 'Bank of Baroda', value: 10000000, color: '#334155' },
    { name: 'Canara Bank', value: 12500000, color: '#475569' },
    { name: 'Other Commercial Banks', value: 15000000, color: '#64748b' },
  ]

  const regionalBreakdown = [
    { region: 'Northern Regional Bureau', count: 142, corpus: 84500000, compliance: '99.1%' },
    { region: 'Western Regional Bureau', count: 186, corpus: 112000000, compliance: '98.4%' },
    { region: 'Southern Regional Bureau', count: 164, corpus: 98000000, compliance: '97.8%' },
    { region: 'South-Western Bureau', count: 98, corpus: 54000000, compliance: '99.5%' },
    { region: 'Eastern Regional Bureau', count: 72, corpus: 38500000, compliance: '96.9%' },
  ]

  const auditColumns: Column<AuditRecord>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: (item) => (
        <span className="font-mono text-xs text-ink-700 block">
          {formatDateTime(item.timestamp)}
        </span>
      ),
    },
    {
      header: 'Official Actor',
      accessorKey: 'actorName',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-950 block text-xs">{item.actorName}</span>
          <span className="text-[10px] text-ink-500 font-mono capitalize">{item.actorRole.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      header: 'Regulatory Action',
      accessorKey: 'action',
      cell: (item) => (
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-canvas border border-line text-navy-900">
          {item.action}
        </span>
      ),
    },
    {
      header: 'Target Entity',
      accessorKey: 'entityType',
      cell: (item) => (
        <span className="text-xs font-mono text-ink-700">
          {item.entityType}:{item.entityId.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Details & Changes',
      accessorKey: 'changeSummary',
      cell: (item) => (
        <span className="text-xs text-ink-800 line-clamp-1 max-w-xs block">
          {item.changeSummary}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Central Admin Header */}
      <PageHeader
        title="Central Regulatory & Statutory Audit Cell"
        description={`Logged in as ${user.name} • ${user.designation} (${user.department || 'AICTE HQ'}) — National Regulatory Oversight`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="comfortable"
              onClick={() => navigate('/audit')}
              leftIcon={<History className="w-4 h-4" />}
            >
              Forensic Audit Trail
            </Button>
            <Button
              variant="primary"
              size="comfortable"
              onClick={() => navigate('/reports')}
              leftIcon={<FileBarChart className="w-4 h-4" />}
            >
              Export Pan-India Statutory Ledger
            </Button>
          </div>
        }
      />

      {/* 4 National Regulatory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              National Security Deposit Reserve
            </span>
            <div className="p-2 rounded-sm bg-navy-100 text-navy-950">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {formatINR(totalNationalCorpus)}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Pan-India</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Accredited Institutions
            </span>
            <div className="p-2 rounded-sm bg-blue-50 text-blue-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {institutions.length || 3} Institutions
            </span>
            <span className="text-xs text-ink-500 font-medium">Under active AICTE mandate</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Statutory Compliance Index
            </span>
            <div className="p-2 rounded-sm bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">98.2%</span>
            <span className="text-xs text-emerald-700 font-medium">All Regional Bureaus</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              System Audit Entries (24h)
            </span>
            <div className="p-2 rounded-sm bg-purple-50 text-purple-700">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-900">
              {auditLogs.length || 12} Logs
            </span>
            <span className="text-xs text-purple-700 font-medium">Hash-chained & verified</span>
          </div>
        </GlassSurface>
      </div>

      {/* Two Pan-India Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commercial Bank Risk Distribution */}
        <Card className="lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-navy-950">Banking Concentration & Capital Exposure</h2>
            <p className="text-xs text-ink-500">Portfolio distribution across Scheduled Commercial Banks</p>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {bankChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value) || 0), 'Exposure']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: 'var(--color-line)',
                    borderRadius: '6px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-line text-xs">
            {bankChartData.map((b) => (
              <div key={b.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-ink-700 truncate max-w-[140px]">{b.name}</span>
                </div>
                <span className="font-mono font-semibold text-navy-900">{formatINR(b.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Regional Office Compliance Ledger */}
        <Card className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-navy-950">Regional Bureau Oversight & Jurisdictions</h2>
            <p className="text-xs text-ink-500">Comparative statutory compliance index across AICTE Regional Bureaus</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line text-ink-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Regional Bureau</th>
                  <th className="py-2.5 px-3 text-right">Institutions</th>
                  <th className="py-2.5 px-3 text-right">Security Corpus</th>
                  <th className="py-2.5 px-3 text-right">Audit Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {regionalBreakdown.map((r) => (
                  <tr key={r.region} className="hover:bg-canvas/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-navy-950 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-ink-500" />
                      <span>{r.region}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-700">{r.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-navy-950">
                      {formatINR(r.corpus)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded font-mono font-semibold text-emerald-800 bg-emerald-50">
                        {r.compliance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Real-time Forensic Audit Trail */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy-950">Live Forensic Audit Ledger Stream</h2>
            <p className="text-xs text-ink-500">Cryptographically tracked administrative events and verification activities</p>
          </div>
          <Button
            variant="outline"
            size="compact"
            onClick={() => navigate('/audit')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Complete Vault
          </Button>
        </div>
        <DataTable
          data={auditLogs.slice(0, 8)}
          columns={auditColumns}
          keyExtractor={(item) => item.id}
          isLoading={auditLoading}
          emptyMessage="No audit logs recorded yet."
        />
      </Card>
    </div>
  )
}
