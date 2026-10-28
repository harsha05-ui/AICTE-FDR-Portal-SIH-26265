import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileCheck2, ArrowUpRight, Search } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Badge, RiskBadge, InstrumentTypeBadge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, Column } from '@/components/tables/DataTable'
import { Input } from '@/components/ui/Input'
import { formatINR, formatDate } from '@/lib/format'
import { FDRRecord } from '@/types'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LienBadge } from '@/components/ui/LienBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'

export const VerificationListPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'discrepancy' | 'verified'>('pending')
  const [search, setSearch] = useState('')

  const { data: fdrs = [], isLoading } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  // Filter based on active tab and search
  const filteredFdrs = fdrs.filter((f) => {
    const vStatus = (f.verificationStatus || '').toUpperCase()

    // Tab filter
    if (activeTab === 'pending') {
      if (vStatus !== 'SUBMITTED' && vStatus !== 'UNDER_REVIEW' && vStatus !== 'PENDING REVIEW') return false
    } else if (activeTab === 'discrepancy') {
      if (vStatus !== 'DISCREPANCY' && vStatus !== 'DISCREPANCY FLAGGED') return false
    } else if (activeTab === 'verified') {
      if (vStatus !== 'VERIFIED') return false
    } else {
      if (vStatus === 'DRAFT' || vStatus === 'NOT SUBMITTED') return false
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNum = (f.fdrNumber || f.referenceNumber || '').toLowerCase().includes(q)
      const matchInst = (f.institutionName || '').toLowerCase().includes(q)
      const matchBank = (f.bankName || '').toLowerCase().includes(q)
      if (!matchNum && !matchInst && !matchBank) return false
    }

    return true
  })

  const pendingCount = fdrs.filter((f) => {
    const s = (f.verificationStatus || '').toUpperCase()
    return s === 'SUBMITTED' || s === 'UNDER_REVIEW' || s === 'PENDING REVIEW'
  }).length

  const discrepancyCount = fdrs.filter((f) => {
    const s = (f.verificationStatus || '').toUpperCase()
    return s === 'DISCREPANCY' || s === 'DISCREPANCY FLAGGED'
  }).length

  const verifiedCount = fdrs.filter((f) => (f.verificationStatus || '').toUpperCase() === 'VERIFIED').length

  const columns: Column<FDRRecord>[] = [
    {
      header: 'FDR Reference No.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-medium text-slate-900 text-xs">
              {item.fdrNumber || item.referenceNumber}
            </span>
            <InstrumentTypeBadge type={item.instrumentType || 'FDR'} />
          </div>
          <div className="text-[11px] text-slate-500">
            {item.bankName} · {item.branchName || 'Main Branch'}
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
          <span className="font-medium text-slate-800 block line-clamp-1">
            {item.institutionName}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            A/C: {item.accountNumber || 'N/A'}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Deposit Amount (INR)',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <span className="tabular-nums font-semibold text-slate-900 text-xs">
          {formatINR(Number(item.amount || item.depositAmount || 0))}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Maturity & SLA',
      accessorKey: 'maturityDate',
      cell: (item) => (
        <div className="space-y-1">
          <span className="text-xs text-slate-600 tabular-nums block">
            {formatDate(item.maturityDate)}
          </span>
          <CountdownChip maturityDate={item.maturityDate} />
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Trust & Lien',
      accessorKey: 'trustLevel',
      cell: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <TrustBadge
            level={item.trustLevel || (item.verificationStatus === 'VERIFIED' ? 'STAFF_VERIFIED' : 'SUBMITTED')}
            isSimulated={item.isSimulated || item.trustLevel === 'SIMULATION'}
          />
          <LienBadge
            status={item.lienStatus || (item.lienMarked ? 'CONFIRMED' : 'NOT_MARKED')}
            referenceNumber={item.lienReferenceNumber}
          />
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant={item.verificationStatus === 'DISCREPANCY' ? 'danger' : 'primary'}
          size="compact"
          onClick={() => navigate(`/verification/${item.id}`)}
        >
          {item.verificationStatus === 'SUBMITTED' ? 'Examine' : 'Desk'}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5 fade-in-settle">
      <PageHeader
        title="Regulatory Scrutiny Queue"
        description="Cross-matching of submitted fixed deposit receipts against banking confirmation channels and statutory criteria."
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
          tabs={[
            { id: 'pending', label: 'Pending Review', badge: pendingCount },
            { id: 'discrepancy', label: 'Discrepancy Flagged', badge: discrepancyCount },
            { id: 'verified', label: 'Verified', badge: verifiedCount },
            { id: 'all', label: 'All in Pipeline', badge: fdrs.length },
          ]}
        />

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search FDR, Bank, Institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredFdrs}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/verification/${item.id}`)}
      />
    </div>
  )
}
