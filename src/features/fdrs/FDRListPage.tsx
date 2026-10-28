import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle, ArrowUpRight, Download, Filter } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, InstrumentSourceBadge } from '@/components/ui/Badge'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LienBadge } from '@/components/ui/LienBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'
import { DataTable, Column } from '@/components/tables/DataTable'
import { FilterBar } from '@/components/tables/FilterBar'
import { Pagination } from '@/components/tables/Pagination'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatDate } from '@/lib/format'
import { FDRRecord } from '@/types'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/feedback/Toast'

export const FDRListPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'
  const bank = searchParams.get('bank') || 'all'
  const instrumentType = searchParams.get('instrumentType') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 10

  const { data: allFDRs = [], isLoading, error } = useQuery({
    queryKey: ['fdrs', { search, status, bank, instrumentType }],
    queryFn: () =>
      api.fdrs.list({
        search,
        status: status !== 'all' ? status : undefined,
        bank: bank !== 'all' ? bank : undefined,
        instrumentType: instrumentType !== 'all' ? instrumentType : undefined,
      }),
  })

  // Pagination calculation
  const totalItems = allFDRs.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const paginatedData = allFDRs.slice((page - 1) * pageSize, page * pageSize)

  const handleSearch = (newSearch: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newSearch) next.set('search', newSearch)
      else next.delete('search')
      next.set('page', '1')
      return next
    })
  }

  const handleStatusChange = (newStatus: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newStatus && newStatus !== 'all') next.set('status', newStatus)
      else next.delete('status')
      next.set('page', '1')
      return next
    })
  }

  const handleBankChange = (newBank: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newBank && newBank !== 'all') next.set('bank', newBank)
      else next.delete('bank')
      next.set('page', '1')
      return next
    })
  }

  const handleTypeChange = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (val && val !== 'all') next.set('instrumentType', val)
      else next.delete('instrumentType')
      next.set('page', '1')
      return next
    })
  }

  const handleReset = () => {
    setSearchParams(new URLSearchParams())
  }

  const handleExportCSV = async () => {
    try {
      await api.reports.downloadCsv({
        type: 'all',
        bank: bank !== 'all' ? bank : undefined,
        status: status !== 'all' ? status : undefined,
        instrumentType: instrumentType !== 'all' ? instrumentType : undefined,
      })
      toast({
        title: 'Export generated',
        description: 'Downloaded FDR records report to CSV.',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Export error',
        description: err.message,
        type: 'error',
      })
    }
  }

  const columns: Column<FDRRecord>[] = [
    {
      header: 'Instrument / FDR no.',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div>
          <span className="font-mono font-medium text-ink-900 block tabular-nums text-xs">
            {item.fdrNumber}
          </span>
          <span className="text-[11px] text-ink-500">{item.bankName}</span>
          <div className="mt-1">
            <InstrumentSourceBadge
              source={item.verificationSource}
              verificationStatus={item.verificationStatus}
            />
          </div>
        </div>
      ),
      sortable: true,
      width: '210px',
    },
    {
      header: 'Institution',
      accessorKey: 'institutionName',
      cell: (item) => (
        <div>
          <span className="font-medium text-ink-900 truncate max-w-xs block text-xs">
            {item.institutionName}
          </span>
          <span className="text-[11px] text-ink-500">Branch: {item.branchName}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Type',
      accessorKey: 'instrumentType',
      cell: (item) => (
        <Badge status={item.instrumentType || 'FDR'} />
      ),
      sortable: true,
      width: '120px',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      align: 'right',
      cell: (item) => (
        <div className="text-right">
          <span className="font-mono font-medium text-ink-900 block tabular-nums text-xs">
            ₹{formatCurrency(Number(item.depositAmount || item.amount) || 0)}
          </span>
          <span className="text-[11px] text-ink-500 tabular-nums">{item.interestRate}% p.a.</span>
        </div>
      ),
      sortable: true,
      width: '140px',
    },
    {
      header: 'Maturity / Days left',
      accessorKey: 'maturityDate',
      cell: (item) => (
        <div className="space-y-1">
          <CountdownChip maturityDate={item.maturityDate} size="sm" />
          <span className="text-[11px] text-ink-500 font-mono block tabular-nums">
            {formatDate(item.maturityDate)}
          </span>
        </div>
      ),
      sortable: true,
      width: '150px',
    },
    {
      header: 'Trust level',
      accessorKey: 'trustLevel',
      cell: (item) => (
        <TrustBadge
          level={item.trustLevel || (item.verificationStatus === 'VERIFIED' ? 'STAFF_VERIFIED' : 'SUBMITTED')}
          isSimulated={item.isSimulated || false}
          size="sm"
        />
      ),
      sortable: true,
      width: '160px',
    },
    {
      header: 'Lien status',
      accessorKey: 'lienStatus',
      cell: (item) => (
        <LienBadge
          status={item.lienStatus || (item.lienMarked ? 'CONFIRMED' : 'NOT_MARKED')}
          referenceNumber={item.lienReferenceNumber}
          size="sm"
        />
      ),
      sortable: true,
      width: '150px',
    },
    {
      header: 'Lifecycle',
      accessorKey: 'lifecycleStatus',
      cell: (item) => <Badge status={item.lifecycleStatus} />,
      sortable: true,
      width: '120px',
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant="secondary"
          size="compact"
          onClick={() => navigate(`/fdrs/${item.id}`)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
      width: '80px',
    },
  ]

  const statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Expiring soon', value: 'EXPIRING' },
    { label: 'Matured', value: 'MATURED' },
    { label: 'Submitted (Review pending)', value: 'SUBMITTED' },
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Discrepancy flagged', value: 'DISCREPANCY' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Renewed', value: 'RENEWED' },
    { label: 'Released', value: 'RELEASED' },
  ]

  const bankOptions = [
    { label: 'All banks', value: 'all' },
    { label: 'State Bank of India', value: 'State Bank of India' },
    { label: 'Punjab National Bank', value: 'Punjab National Bank' },
    { label: 'Canara Bank', value: 'Canara Bank' },
    { label: 'Bank of Baroda', value: 'Bank of Baroda' },
    { label: 'HDFC Bank', value: 'HDFC Bank' },
    { label: 'ICICI Bank', value: 'ICICI Bank' },
    { label: 'Union Bank of India', value: 'Union Bank of India' },
    { label: 'Axis Bank', value: 'Axis Bank' },
  ]

  const canRegister = user?.role === 'INSTITUTION_USER' || user?.role === 'ADMIN' || user?.role === 'AICTE_ADMIN'

  return (
    <div className="space-y-4">
      <PageHeader
        title={user?.role === 'INSTITUTION_USER' ? 'My Deposits & Instruments' : 'Deposit Instruments Registry'}
        description="Fixed Deposit Receipts and security deposit ledger with lien and verification tracking."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            {canRegister && (
              <Button
                variant="primary"
                size="default"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={() => navigate('/fdrs/new')}
              >
                Register new instrument
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Bar with URL sync */}
      <FilterBar
        searchQuery={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Search by FDR number, institution or bank..."
        statusFilter={status}
        onStatusChange={handleStatusChange}
        statusOptions={statusOptions}
        bankFilter={bank}
        onBankChange={handleBankChange}
        bankOptions={bankOptions}
        onReset={handleReset}
        extraFilters={
          <div className="min-w-[160px]">
            <Select
              value={instrumentType}
              onChange={(e) => handleTypeChange(e.target.value)}
              inputSize="default"
              aria-label="Filter by instrument type"
            >
              <option value="all">All deposit types</option>
              <option value="FDR">FDR only</option>
              <option value="SECURITY_DEPOSIT">Security deposit only</option>
            </Select>
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          Failed to fetch instruments: {error instanceof Error ? error.message : 'Network error'}
        </div>
      )}

      {/* Data Table */}
      <div className="space-y-2">
        <DataTable
          columns={columns}
          data={paginatedData}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
          emptyMessage="No statutory instruments found matching criteria."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={(p) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('page', String(p))
              return next
            })
          }}
        />
      </div>
    </div>
  )
}
