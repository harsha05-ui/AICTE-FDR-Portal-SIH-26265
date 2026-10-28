import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Play } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatDateTime } from '@/lib/format'
import { AuditRecord } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'

export const AuditPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null)

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.audit.list(),
  })

  // Admin "Run Maturity Check" Mutation
  const maturityCheckMutation = useMutation({
    mutationFn: () => api.admin.runMaturityCheck(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['audit'] })
      queryClient.invalidateQueries({ queryKey: ['fdrs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({
        title: 'Maturity check completed',
        description: res.message || `Processed ${res.recordsChecked || 0} instruments; ${res.notificationsGenerated || 0} alerts dispatched.`,
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Maturity check failed',
        description: err.message || 'Unable to execute maturity check routine.',
        type: 'danger',
      })
    },
  })

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AICTE_ADMIN'

  const filteredLogs = auditLogs.filter((log) => {
    const q = search.toLowerCase()
    return (
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.changeSummary || '').toLowerCase().includes(q)
    )
  })

  const columns: Column<AuditRecord>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: (item) => (
        <span className="font-mono text-xs text-ink-700 tabular-nums">
          {formatDateTime(item.timestamp)}
        </span>
      ),
      sortable: true,
      width: '160px',
    },
    {
      header: 'Actor',
      accessorKey: 'actorName',
      cell: (item) => (
        <div>
          <span className="font-medium text-ink-900 block text-xs">{item.actorName}</span>
          <span className="text-[11px] text-ink-500">{item.actorRole}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (item) => (
        <span className="font-mono text-xs px-2 py-0.5 bg-canvas rounded-full border border-line text-ink-900 tabular-nums">
          {item.action}
        </span>
      ),
      sortable: true,
      width: '180px',
    },
    {
      header: 'Entity',
      accessorKey: 'entityType',
      cell: (item) => (
        <span className="text-xs text-ink-700">
          {item.entityType} #{item.entityId ? item.entityId.slice(0, 12) : ''}
        </span>
      ),
      width: '140px',
    },
    {
      header: 'Change summary',
      accessorKey: 'changeSummary',
      cell: (item) => (
        <span className="text-xs text-ink-900 truncate max-w-md block">
          {item.changeSummary}
        </span>
      ),
    },
    {
      header: 'Detail',
      align: 'center',
      cell: (item) => (
        <Button
          variant="secondary"
          size="compact"
          onClick={() => setSelectedAudit(item)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
      width: '90px',
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Trail"
        description="Immutable record of user actions, verification decisions, fund releases, and system updates."
        action={
          isAdmin && (
            <Button
              variant="primary"
              size="default"
              leftIcon={<Play className="w-4 h-4" />}
              loading={maturityCheckMutation.isPending}
              onClick={() => maturityCheckMutation.mutate()}
            >
              Run maturity check
            </Button>
          )
        }
      />

      <div className="p-2.5 bg-surface border border-line rounded-md shadow-level-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit actions, actors, or entity IDs..."
            leftElement={<Search className="w-4 h-4 text-ink-500" />}
          />
        </div>
        <span className="text-xs text-ink-500 font-mono tabular-nums pr-2">
          {filteredLogs.length} audit records
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No audit trail entries matching query."
      />

      {/* Authorised Detail View Dialog */}
      <Dialog
        open={Boolean(selectedAudit)}
        onClose={() => setSelectedAudit(null)}
        title="Audit entry detail"
        description="Full record of entity change and actor identity."
        footer={
          <Button variant="secondary" onClick={() => setSelectedAudit(null)}>
            Close
          </Button>
        }
      >
        {selectedAudit && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-canvas border border-line rounded-md space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-ink-500">Record ID:</span>
                <strong className="text-ink-900 tabular-nums">{selectedAudit.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Timestamp:</span>
                <span className="tabular-nums">{formatDateTime(selectedAudit.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Actor identity:</span>
                <strong className="text-ink-900">
                  {selectedAudit.actorName} ({selectedAudit.actorRole})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">IP address:</span>
                <span className="tabular-nums">{selectedAudit.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Target entity:</span>
                <span>
                  {selectedAudit.entityType} ({selectedAudit.entityId})
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-ink-700 block mb-1">
                Change summary:
              </span>
              <div className="p-3 bg-surface border border-line rounded-md text-ink-900 leading-relaxed">
                {selectedAudit.changeSummary}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
