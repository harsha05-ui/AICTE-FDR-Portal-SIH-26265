import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileCheck2,
  AlertTriangle,
  Clock,
  ScanText,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Column } from '@/components/tables/DataTable'
import { formatINR } from '@/lib/format'
import { FDRRecord, User } from '@/types'

interface ReviewerDashboardProps {
  user: User
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({ user }) => {
  const navigate = useNavigate()

  const { data: fdrs = [], isLoading } = useQuery({
    queryKey: ['fdrs'],
    queryFn: () => api.fdrs.list(),
  })

  // Reviewer specific priorities: Pending review and Discrepancy flagged
  const pendingQueue = fdrs.filter((f) => f.verificationStatus === 'Pending review')
  const discrepancyQueue = fdrs.filter((f) => f.verificationStatus === 'Discrepancy flagged')

  const queueColumns: Column<FDRRecord>[] = [
    {
      header: 'Instrument & Bank',
      accessorKey: 'fdrNumber',
      cell: (item) => (
        <div>
          <span className="font-semibold text-navy-950 font-mono block">{item.fdrNumber}</span>
          <span className="text-[11px] text-ink-500">{item.bankName} • {item.branchName}</span>
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
          <span className="text-[11px] text-ink-500">ID: {item.institutionId}</span>
        </div>
      ),
    },
    {
      header: 'Deposit Amount',
      accessorKey: 'amount',
      cell: (item) => (
        <span className="font-mono font-semibold text-navy-900">
          {formatINR(Number(item.amount || 0))}
        </span>
      ),
    },
    {
      header: 'Scrutiny Urgency',
      accessorKey: 'verificationStatus',
      cell: (item) => <Badge status={item.verificationStatus} />,
    },
    {
      header: 'Action',
      accessorKey: 'id',
      cell: (item) => (
        <Button
          size="compact"
          variant="secondary"
          onClick={() => navigate(`/verification/${item.id}`)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Scrutinize
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Reviewer Desk Header */}
      <PageHeader
        title="Scrutiny & Verification Desk"
        description={`Logged in as ${user.name} • ${user.designation} (${user.department || 'Northern Regional Bureau'}) — Active Scrutiny Desk SLA: 48h`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="comfortable"
              onClick={() => navigate('/ocr')}
              leftIcon={<ScanText className="w-4 h-4" />}
            >
              OCR Batch Scan
            </Button>
            <Button
              variant="primary"
              size="comfortable"
              onClick={() => navigate('/verification')}
              leftIcon={<FileCheck2 className="w-4 h-4" />}
            >
              Full Verification Queue ({pendingQueue.length + discrepancyQueue.length})
            </Button>
          </div>
        }
      />

      {/* 4 Reviewer Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Pending Scrutiny
            </span>
            <div className="p-2 rounded-sm bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">
              {pendingQueue.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">Instruments awaiting review</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Flagged Discrepancies
            </span>
            <div className="p-2 rounded-sm bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700">
              {discrepancyQueue.length}
            </span>
            <span className="text-xs text-rose-700 font-medium">Require bank clarification</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              OCR Match Confidence
            </span>
            <div className="p-2 rounded-sm bg-blue-50 text-blue-700">
              <ScanText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">96.4%</span>
            <span className="text-xs text-emerald-700 font-medium">Automated extraction accuracy</span>
          </div>
        </GlassSurface>

        <GlassSurface variant="card" className="p-4 rounded-md border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">
              Avg Verification Turnaround
            </span>
            <div className="p-2 rounded-sm bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-navy-950">1.8 Days</span>
            <span className="text-xs text-emerald-700 font-medium">Within 48h SLA guideline</span>
          </div>
        </GlassSurface>
      </div>

      {/* Priority Desk Queue */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy-950">Immediate Scrutiny Priority Queue</h2>
            <p className="text-xs text-ink-500">Fixed Deposit Receipts pending officer verification and bank confirmation cross-check</p>
          </div>
          <Button
            variant="outline"
            size="compact"
            onClick={() => navigate('/verification')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Full Desk
          </Button>
        </div>
        <DataTable
          data={[...discrepancyQueue, ...pendingQueue]}
          columns={queueColumns}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          emptyMessage="No instruments currently pending review. Great work!"
        />
      </Card>

      {/* Reviewer Guidance & OCR Advisory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassSurface variant="card" className="p-5 rounded-md border border-line space-y-3">
          <div className="flex items-center gap-2 text-navy-900 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Four-Point Statutory Scrutiny Checklist</span>
          </div>
          <ul className="text-xs text-ink-700 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-navy-100 text-navy-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span><strong>Joint Account Holder:</strong> Verify FDR instrument is drawn jointly in the name of <em>Principal/Trust & Regional Officer, AICTE</em>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-navy-100 text-navy-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span><strong>Exclusive Lien Marking:</strong> Inspect bank confirmation letter for irrevocable lien endorsement in favour of AICTE.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-navy-100 text-navy-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span><strong>Tenure Compliance:</strong> Ensure deposit period matches minimum required duration (minimum 5 or 8 years per approval norms).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-navy-100 text-navy-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span><strong>Bank Branch Authentication:</strong> Validate IFSC code belongs to a recognized Scheduled Commercial Bank branch.</span>
            </li>
          </ul>
        </GlassSurface>

        <GlassSurface variant="card" className="p-5 rounded-md border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-navy-900 font-semibold text-sm">
              <ScanText className="w-4 h-4 text-blue-600" />
              <span>Assisted OCR Extraction Benchmarks</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800">AI Advisory</span>
          </div>
          <p className="text-xs text-ink-600 leading-normal">
            Automated OCR extracts key financial tokens upon document upload to accelerate side-by-side desk verification:
          </p>
          <div className="space-y-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>FDR Receipt Number Match</span>
                <span className="font-mono text-emerald-700">99.2%</span>
              </div>
              <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '99%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Deposit Amount & Numeral Match</span>
                <span className="font-mono text-emerald-700">100.0%</span>
              </div>
              <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span>Lien & Joint Mandate Clause Detection</span>
                <span className="font-mono text-amber-700">92.4%</span>
              </div>
              <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
          </div>
        </GlassSurface>
      </div>
    </div>
  )
}
