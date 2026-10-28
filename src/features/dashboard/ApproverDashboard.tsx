import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Unlock,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  FileBarChart,
  Award
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate } from '@/lib/format'
import { RenewalRequest, ReleaseRequest, User } from '@/types'

interface ApproverDashboardProps {
  user: User
}

export const ApproverDashboard: React.FC<ApproverDashboardProps> = ({ user }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'renewals' | 'releases'>('renewals')

  const { data: renewals = [], isLoading: renewalsLoading } = useQuery({
    queryKey: ['renewals'],
    queryFn: () => api.renewals.list(),
  })

  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => api.releases.list(),
  })

  const { data: fdrs = [] } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  const pendingRenewals = renewals.filter(
    (r) => r.requestStatus === 'Under review' || r.requestStatus === 'Submitted'
  )
  const pendingReleases = releases.filter(
    (r) => r.requestStatus === 'Under review' || r.requestStatus === 'Submitted'
  )

  const highValueFdrs = fdrs.filter((f) => Number(f.amount || 0) >= 10000000)
  const totalRegionalCorpus = fdrs.reduce((acc, f) => acc + Number(f.amount || 0), 0)

  const renewalColumns: Column<RenewalRequest>[] = [
    {
      header: 'Request Reference',
      accessorKey: 'id',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-950 font-mono block">REQ-{item.id.slice(-6).toUpperCase()}</span>
          <span className="text-[11px] text-ink-500">{item.requestType} Application</span>
        </div>
      ),
    },
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <div>
          <span className="text-xs font-medium text-ink-900 block truncate max-w-[200px]">
            {item.institutionName}
          </span>
          <span className="text-[11px] text-ink-500">Target Bank: {item.newBankName}</span>
        </div>
      ),
    },
    {
      header: 'Proposed Capital',
      accessorKey: 'proposedAmount',
      cell: (item) => (
        <div>
          <span className="font-mono font-semibold text-navy-900 block">
            {formatINR(Number(item.proposedAmount || 0))}
          </span>
          <span className="text-[11px] text-ink-500">Matures: {formatDate(item.proposedMaturityDate)}</span>
        </div>
      ),
    },
    {
      header: 'Statutory Status',
      accessorKey: 'requestStatus',
      cell: (item) => <Badge status={item.requestStatus} />,
    },
    {
      header: 'Sanction Action',
      accessorKey: 'id',
      cell: () => (
        <Button
          size="compact"
          variant="primary"
          onClick={() => navigate('/renewals')}
          leftIcon={<Award className="w-3.5 h-3.5" />}
        >
          Review & Sanction
        </Button>
      ),
    },
  ]

  const releaseColumns: Column<ReleaseRequest>[] = [
    {
      header: 'Release Case ID',
      accessorKey: 'id',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-950 font-mono block">REL-{item.id.slice(-6).toUpperCase()}</span>
          <span className="text-[11px] text-ink-500">Security Relinquishment</span>
        </div>
      ),
    },
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <div>
          <span className="text-xs font-medium text-ink-900 block truncate max-w-[200px]">
            {item.institutionName}
          </span>
          <span className="text-[11px] text-ink-500">FDR: {item.fdrNumber}</span>
        </div>
      ),
    },
    {
      header: 'Relinquishment Amount',
      accessorKey: 'amount',
      cell: (item) => (
        <span className="font-mono font-semibold text-navy-900">
          {formatINR(Number(item.amount || 0))}
        </span>
      ),
    },
    {
      header: 'Review Stage',
      accessorKey: 'requestStatus',
      cell: (item) => <Badge status={item.requestStatus} />,
    },
    {
      header: 'Sanction Action',
      accessorKey: 'id',
      cell: () => (
        <Button
          size="compact"
          variant="primary"
          onClick={() => navigate('/releases')}
          leftIcon={<Unlock className="w-3.5 h-3.5" />}
        >
          Issue Council Order
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Approver Header */}
      <PageHeader
        title="Regional Director Approval Bureau"
        description={`Logged in as ${user.name} • ${user.designation} (${user.department || 'Approval Bureau'}) — Statutory Sanction Authority`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="comfortable"
              onClick={() => navigate('/reports')}
              leftIcon={<FileBarChart className="w-4 h-4" />}
            >
              Regional Executive Summary
            </Button>
            <Button
              variant="primary"
              size="comfortable"
              onClick={() => navigate('/renewals')}
              leftIcon={<Award className="w-4 h-4" />}
            >
              Pending Sanctions ({pendingRenewals.length + pendingReleases.length})
            </Button>
          </div>
        }
      />

      {/* 4 Director Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Pending Renewal Sanctions
            </span>
            <div className="p-2 rounded-sm bg-amber-50 text-amber-700">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {pendingRenewals.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">Require formal sign-off</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Pending Release Orders
            </span>
            <div className="p-2 rounded-sm bg-purple-50 text-purple-700">
              <Unlock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-900">
              {pendingReleases.length}
            </span>
            <span className="text-xs text-purple-700 font-medium">Relinquishment files</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              High-Value Capital Under Lien
            </span>
            <div className="p-2 rounded-sm bg-blue-50 text-blue-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {formatINR(totalRegionalCorpus)}
            </span>
            <span className="text-xs text-ink-500 font-medium">Total active lien</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Instruments ≥ ₹ 1.00 Cr
            </span>
            <div className="p-2 rounded-sm bg-emerald-50 text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {highValueFdrs.length}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Direct Director oversight</span>
          </div>
        </GlassSurface>
      </div>

      {/* Two-Tab Executive Sanctions Workspace */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy-950">Sanction & Council Order Authorizations</h2>
            <p className="text-xs text-ink-500">Review institutional requests requiring statutory Regional Director approval</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-sm bg-canvas border border-line">
            <button
              type="button"
              onClick={() => setActiveTab('renewals')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'renewals'
                  ? 'bg-navy-900 text-white shadow-level-1'
                  : 'text-ink-700 hover:text-navy-950'
              }`}
            >
              Renewals & Replacements ({pendingRenewals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('releases')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'releases'
                  ? 'bg-navy-900 text-white shadow-level-1'
                  : 'text-ink-700 hover:text-navy-950'
              }`}
            >
              Relinquishments & Refunds ({pendingReleases.length})
            </button>
          </div>
        </div>

        {activeTab === 'renewals' ? (
          <DataTable
            data={pendingRenewals}
            columns={renewalColumns}
            keyExtractor={(item) => item.id}
            isLoading={renewalsLoading}
            emptyMessage="No pending renewal applications awaiting sanction."
          />
        ) : (
          <DataTable
            data={pendingReleases}
            columns={releaseColumns}
            keyExtractor={(item) => item.id}
            isLoading={releasesLoading}
            emptyMessage="No pending release requests awaiting council order."
          />
        )}
      </Card>

      {/* Director Statutory Authority Guidelines */}
      <GlassSurface variant="card" className="p-5 rounded-md border border-line">
        <h3 className="text-sm font-semibold text-navy-950 mb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          <span>Statutory Authority & Council Order Mandate (Chapter IV AICTE Regulations)</span>
        </h3>
        <p className="text-xs text-ink-700 leading-relaxed mb-3">
          As Regional Director and designated Sanction Authority, your digital approval authorizes:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-sm bg-canvas/60 border border-line">
            <span className="font-semibold text-navy-900 block mb-1">1. Deposit Continuity</span>
            <span className="text-ink-600 text-[11px] leading-normal block">
              Authorization of seamless principal roll-over upon maturity, ensuring zero-gap statutory lien protection.
            </span>
          </div>
          <div className="p-3 rounded-sm bg-canvas/60 border border-line">
            <span className="font-semibold text-navy-900 block mb-1">2. Scheduled Bank Transfers</span>
            <span className="text-ink-600 text-[11px] leading-normal block">
              Sign-off on replacement FDRs moving between Scheduled Commercial Banks upon interest rate renegotiation.
            </span>
          </div>
          <div className="p-3 rounded-sm bg-canvas/60 border border-line">
            <span className="font-semibold text-navy-900 block mb-1">3. Formal Relinquishment Order</span>
            <span className="text-ink-600 text-[11px] leading-normal block">
              Generation of digitally stamped Council Relinquishment Letter instructing bank managers to release lien.
            </span>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}
