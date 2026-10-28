import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  ArrowLeft,
  PlusCircle,
  ShieldCheck,
  History,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, InstrumentTypeBadge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR, formatDate, formatDateTime } from '@/lib/format'
import { FDRRecord } from '@/types'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: institution, isLoading: instLoading, error } = useQuery({
    queryKey: ['institution', id],
    queryFn: () => api.institutions.getById(id || 'inst-1'),
  })

  const { data: fdrs = [], isLoading: fdrsLoading } = useQuery({
    queryKey: ['fdrs', { institutionId: id }],
    queryFn: () => api.fdrs.list({ institutionId: id }),
    enabled: Boolean(id),
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.audit.list(),
  })

  if (instLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !institution) {
    return (
      <ErrorState
        title="Institution not found"
        message={`The institution record "${id}" could not be located in the directory.`}
        onRetry={() => navigate('/institutions')}
      />
    )
  }

  const fdrColumns: Column<FDRRecord>[] = [
    {
      header: 'Instrument / FDR no.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-medium text-ink-900 block text-xs tabular-nums">
              {item.fdrNumber || item.referenceNumber}
            </span>
            <InstrumentTypeBadge type={item.instrumentType || 'FDR'} />
          </div>
          <span className="text-[11px] text-ink-500 block">{item.bankName}</span>
          <InstrumentSourceBadge />
        </div>
      ),
    },
    {
      header: 'Deposit amount',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <span className="font-mono font-medium text-ink-900 tabular-nums text-xs">
          {formatINR(item.amount || item.depositAmount || 0)}
        </span>
      ),
    },
    {
      header: 'Maturity date',
      accessorKey: 'maturityDate',
      cell: (item) => (
        <span className="font-mono text-xs text-ink-700 tabular-nums">
          {formatDate(item.maturityDate)}
        </span>
      ),
    },
    {
      header: 'Lifecycle',
      accessorKey: 'lifecycleStatus',
      cell: (item) => <Badge status={item.lifecycleStatus} />,
    },
    {
      header: 'Verification',
      accessorKey: 'verificationStatus',
      cell: (item) => <Badge status={item.verificationStatus} />,
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant="secondary"
          size="compact"
          onClick={() => navigate(`/fdrs/${item.id}`)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="compact"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/institutions')}
        >
          Back to directory
        </Button>
      </div>

      <PageHeader
        title={institution.name.replace(/^\[DEMO\]\s*/i, '')}
        description={`AICTE Permanent ID: ${institution.aictePermanentId} • ${institution.city}, ${institution.state} • ${institution.region} region`}
        action={
          <div className="flex items-center gap-2">
            <Badge status={institution.status === 'Active' ? 'Active' : 'Pending review'}>
              {institution.status}
            </Badge>
            <Button
              variant="primary"
              size="default"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => navigate(`/fdrs/new?institutionId=${institution.id}`)}
            >
              Add FDR
            </Button>
          </div>
        }
      />

      {/* Detail Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: 'Overview & Contacts' },
          { id: 'fdrs', label: 'Linked FDR Instruments', badge: fdrs.length },
          { id: 'activity', label: 'Compliance Audit Activity' },
        ]}
      />

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-4">
            <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
              <Building2 className="w-4 h-4 text-ink-700" />
              <span>Campus & coordinates</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-ink-500 block text-[11px]">Physical address</span>
                <span className="font-medium text-ink-900">{institution.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ink-500 block text-[11px]">City & State</span>
                  <span className="font-medium text-ink-900">{institution.city}, {institution.state}</span>
                </div>
                <div>
                  <span className="text-ink-500 block text-[11px]">Regional jurisdiction</span>
                  <span className="font-medium text-ink-900">{institution.region} region</span>
                </div>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Institutional category</span>
                <span className="font-medium text-ink-900">{institution.type}</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-ink-700" />
              <span>Signatory & financial profile</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-ink-500 block text-[11px]">Principal / Director</span>
                <span className="font-medium text-ink-900">{institution.principalName}</span>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Email</span>
                <span className="font-mono text-ink-900">{institution.contactEmail}</span>
              </div>
              <div>
                <span className="text-ink-500 block text-[11px]">Telephone</span>
                <span className="font-mono text-ink-900 tabular-nums">{institution.contactPhone}</span>
              </div>
              <div className="pt-2 border-t border-line flex items-center justify-between">
                <span className="text-xs text-ink-700 font-medium">Total locked corpus:</span>
                <span className="font-mono font-semibold text-base text-ink-900 tabular-nums">
                  {formatINR(Number(institution.totalDeposits || 0))}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* FDRS TAB */}
      {activeTab === 'fdrs' && (
        <DataTable
          columns={fdrColumns}
          data={fdrs}
          keyExtractor={(item) => item.id}
          isLoading={fdrsLoading}
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
          emptyMessage="No linked FDR instruments found for this institution."
        />
      )}

      {/* ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
            <History className="w-4 h-4 text-ink-700" />
            <span>Compliance timeline</span>
          </h2>
          <div className="divide-y divide-line">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-ink-500 text-[11px]">
                  <span className="font-medium text-ink-900">{log.actorName} ({log.actorRole})</span>
                  <span className="font-mono tabular-nums">{formatDateTime(log.timestamp)}</span>
                </div>
                <p className="text-ink-800 leading-normal">{log.changeSummary}</p>
                <div className="text-[10px] text-ink-500 font-mono">Entity: {log.entityType} #{log.entityId}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
