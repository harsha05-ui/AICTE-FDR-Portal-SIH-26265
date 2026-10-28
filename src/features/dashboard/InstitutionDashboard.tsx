import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
  Landmark,
  Building2
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate } from '@/lib/format'
import { FDRRecord, User } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export interface InstitutionDashboardProps {
  user: User
}

export const InstitutionDashboard: React.FC<InstitutionDashboardProps> = ({ user }) => {
  const navigate = useNavigate()

  const { data: fdrs = [], isLoading } = useQuery({
    queryKey: ['fdrs', { institutionId: user.institutionId }],
    queryFn: () => api.fdrs.list({ institutionId: user.institutionId }),
  })

  const { data: renewals = [] } = useQuery({
    queryKey: ['renewals'],
    queryFn: () => api.renewals.list(),
  })

  const { data: releases = [] } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  })

  // Computations
  const totalAmount = fdrs.reduce((acc, f) => acc + Number(f.amount || 0), 0)
  const activeCount = fdrs.filter((f) => f.lifecycleStatus === 'Active').length
  const maturingSoonCount = fdrs.filter((f) => f.lifecycleStatus === 'Maturing soon').length
  const pendingVerificationCount = fdrs.filter((f) => f.verificationStatus === 'Pending review').length
  const discrepanciesCount = fdrs.filter((f) => f.verificationStatus === 'Discrepancy flagged').length

  // Maturity distribution chart data
  const maturityChartData = [
    { year: '2026', total: 10000000, label: '₹ 1.00 Cr' },
    { year: '2027', total: 0, label: '₹ 0.00' },
    { year: '2028', total: 15000000, label: '₹ 1.50 Cr' },
    { year: '2029', total: 0, label: '₹ 0.00' },
    { year: '2030', total: 0, label: '₹ 0.00' },
    { year: '2031', total: 10000000, label: '₹ 1.00 Cr' },
  ]

  const columns: Column<FDRRecord>[] = [
    {
      header: 'FDR Reference No.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-900 font-mono block">{item.fdrNumber}</span>
          <span className="text-[11px] text-ink-500">{item.bankName}</span>
        </div>
      ),
    },
    {
      header: 'Deposit Amount (INR)',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <span className="font-semibold font-mono text-ink-900">{formatINR(Number(item.amount || 0))}</span>
      ),
    },
    {
      header: 'Maturity Date',
      accessorKey: 'maturityDate',
      cell: (item) => <span>{formatDate(item.maturityDate)}</span>,
    },
    {
      header: 'Lifecycle',
      accessorKey: 'lifecycleStatus',
      cell: (item) => <Badge status={item.lifecycleStatus} />,
    },
    {
      header: 'Verification State',
      accessorKey: 'verificationStatus',
      cell: (item) => <Badge status={item.verificationStatus} />,
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant="outline"
          size="compact"
          onClick={() => navigate(`/fdrs/${item.id}`)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Institution Dashboard`}
        description={`${user.institutionName || 'Authorized Institution'} • AICTE Permanent Regulatory Compliance Portal`}
        action={
          <Button
            variant="primary"
            size="default"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/fdrs/new')}
          >
            Register New FDR
          </Button>
        }
      />

      {/* Row of Summary Cards in Light Glass per PRD Section 2.1 & 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Active Corpus</span>
            <Landmark className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-950 font-mono tabular-nums">
            {formatINR(totalAmount)}
          </div>
          <div className="mt-2 text-[11px] text-ink-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-800">{activeCount} instruments</span> actively locked
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Maturing Within 60 Days</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 font-mono tabular-nums">
            {maturingSoonCount}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            {maturingSoonCount > 0 ? (
              <Link to="/renewals" className="text-navy-900 font-semibold hover:underline">
                Initiate statutory renewal →
              </Link>
            ) : (
              'All maturities comfortably spaced'
            )}
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Verification Queue</span>
            <ShieldCheck className="w-4 h-4 text-navy-700" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-950 font-mono tabular-nums">
            {pendingVerificationCount}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            {discrepanciesCount > 0 ? (
              <span className="text-danger font-semibold">
                {discrepanciesCount} action required
              </span>
            ) : (
              'Under regional officer review'
            )}
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">Active Requests</span>
            <TrendingUp className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-navy-950 font-mono tabular-nums">
            {renewals.length + releases.length}
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            {renewals.length} renewals • {releases.length} releases
          </div>
        </GlassSurface>
      </div>

      {/* Discrepancy Alert Banner if any flagged */}
      {discrepanciesCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md flex items-start justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Attention: Discrepancy Flagged on Submitted Instruments</p>
              <p className="text-rose-800 mt-0.5 leading-relaxed">
                The AICTE Regional Approval Bureau has flagged a missing branch endorsement on FDR/BOB/2026/90214. Please review the officer remarks and provide the corrected declaration.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="compact"
            onClick={() => navigate('/verification/fdr-103')}
          >
            Review Discrepancy
          </Button>
        </div>
      )}

      {/* Middle Grid: Maturity Chart (Solid card) & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  Statutory Maturity Distribution (INR)
                </h2>
                <p className="text-xs text-ink-500">Maturity schedule across financial years</p>
              </div>
              <Badge status="Active">Verified Vault</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maturityChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" stroke="#4a5568" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#4a5568"
                    fontSize={11}
                    tickFormatter={(v) => `₹ ${(v / 10000000).toFixed(1)} Cr`}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Maturing Corpus']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" fill="#1e293b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Side Panel: Institution Summary */}
        <div>
          <Card className="h-full flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-line">
                <Building2 className="w-4 h-4 text-navy-800" />
                <h3 className="text-sm font-semibold text-ink-900">Institution Metadata</h3>
              </div>
              <div className="space-y-3 mt-3 text-xs">
                <div>
                  <span className="text-ink-500 block text-[11px]">AICTE Permanent ID</span>
                  <span className="font-mono font-semibold text-ink-900">1-10023412</span>
                </div>
                <div>
                  <span className="text-ink-500 block text-[11px]">Regional Jurisdiction</span>
                  <span className="font-medium text-ink-900">Northern Regional Office (NRO)</span>
                </div>
                <div>
                  <span className="text-ink-500 block text-[11px]">Institution Classification</span>
                  <span className="font-medium text-ink-900">Government / Autonomous Institute</span>
                </div>
                <div>
                  <span className="text-ink-500 block text-[11px]">Lien Guarantee Requirement</span>
                  <span className="font-medium text-emerald-800">100% Inscribed to AICTE</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-line">
              <Button
                variant="outline"
                size="default"
                className="w-full justify-center"
                onClick={() => navigate('/institutions')}
              >
                View Full Institution Dossier
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Primary Data Table: Searchable FDR Table on Solid Surface */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-navy-900" />
            <h2 className="text-sm font-semibold text-ink-900">Security Deposit Instruments</h2>
          </div>
          <Link
            to="/fdrs"
            className="text-xs text-navy-800 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Open complete registry</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={fdrs}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
        />
      </div>
    </div>
  )
}
