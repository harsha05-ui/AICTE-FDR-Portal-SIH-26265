import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowUpRight, MapPin } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR } from '@/lib/format'
import { Institution } from '@/types'

export const InstitutionListPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.institutions.list(),
  })

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.aictePermanentId.toLowerCase().includes(search.toLowerCase()) ||
      (inst.city || '').toLowerCase().includes(search.toLowerCase())

    const matchesRegion = regionFilter === 'all' || inst.region === regionFilter
    const matchesType = typeFilter === 'all' || inst.type === typeFilter

    return matchesSearch && matchesRegion && matchesType
  })

  const columns: Column<Institution>[] = [
    {
      header: 'Permanent ID',
      accessorKey: 'aictePermanentId',
      cell: (item) => (
        <span className="font-mono font-medium text-ink-900 tabular-nums text-xs">
          {item.aictePermanentId}
        </span>
      ),
      sortable: true,
      width: '140px',
    },
    {
      header: 'Institution & Location',
      accessorKey: 'name',
      cell: (item) => (
        <div>
          <span className="font-medium text-ink-900 block text-xs">
            {item.name.replace(/^\[DEMO\]\s*/i, '')}
          </span>
          <span className="text-[11px] text-ink-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-ink-500" />
            <span>{item.city}, {item.state} ({item.region} region)</span>
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Classification',
      accessorKey: 'type',
      cell: (item) => <span className="text-xs text-ink-700">{item.type}</span>,
      sortable: true,
    },
    {
      header: 'Active instruments',
      accessorKey: 'activeInstruments',
      align: 'center',
      cell: (item) => (
        <span className="font-mono text-xs px-2 py-0.5 bg-canvas rounded-full border border-line tabular-nums text-ink-700">
          {item.activeInstruments} FDRs
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Total deposits',
      accessorKey: 'totalDeposits',
      align: 'right',
      cell: (item) => (
        <span className="font-mono font-medium text-ink-900 tabular-nums text-xs">
          {formatINR(Number(item.totalDeposits || 0))}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <Badge
          status={item.status === 'Active' ? 'Active' : item.status === 'Under Review' ? 'Pending review' : 'Rejected'}
        >
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      cell: (item) => (
        <Button
          variant="secondary"
          size="compact"
          onClick={() => navigate(`/institutions/${item.id}`)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institutions Directory"
        description="Directory of approved technical campuses, statutory deposit obligations, and linked instruments."
      />

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 p-3 bg-surface border border-line rounded-md shadow-level-1">
        <div className="flex-1 min-w-[240px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by institution name, AICTE ID or city..."
            leftElement={<Search className="w-4 h-4 text-ink-500" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="Filter by region"
          >
            <option value="all">All regions</option>
            <option value="Northern">Northern</option>
            <option value="Western">Western</option>
            <option value="Southern">Southern</option>
            <option value="South-Western">South-Western</option>
            <option value="Eastern">Eastern</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="all">All institution types</option>
            <option value="Government">Government</option>
            <option value="Govt-Aided">Govt-Aided</option>
            <option value="Private-Unaided">Private-Unaided</option>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredInstitutions}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/institutions/${item.id}`)}
        emptyMessage="No institutions matching your criteria."
      />
    </div>
  )
}
