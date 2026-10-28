import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusValue } from '@/components/ui/Badge'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LienBadge } from '@/components/ui/LienBadge'
import { CountdownChip } from '@/components/ui/CountdownChip'
import { StageTracker } from '@/components/ui/StageTracker'
import { DocumentViewer } from '@/components/ui/DocumentViewer'
import { KPICard } from '@/components/ui/KPICard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Tabs } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { Field } from '@/components/forms/Field'
import { CurrencyInput } from '@/components/forms/CurrencyInput'
import { DateField } from '@/components/forms/DateField'
import { FileDropzone } from '@/components/forms/FileDropzone'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useToast } from '@/components/feedback/Toast'
import { formatINR, formatDate } from '@/lib/format'
import {
  CheckCircle2,
  Shield,
  Eye,
  Send,
  Bell,
  Landmark,
  Building,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { ReleaseStage } from '@/types'

export const StyleGuidePage: React.FC = () => {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('regulatory')
  const [currencyVal, setCurrencyVal] = useState<number>(1250000)
  const [dateVal, setDateVal] = useState('2026-10-23')

  const sampleStages: ReleaseStage[] = [
    {
      id: 'stg-1',
      releaseRequestId: 'rel-1',
      office: 'REGIONAL_OFFICE',
      sequence: 1,
      status: 'APPROVED',
      enteredAt: '2026-10-18T10:00:00Z',
      actionedAt: '2026-10-19T14:30:00Z',
      slaHours: 168,
      actorName: 'Dr. R. Sharma (RO Officer)',
      actionRemarks: 'Inspected physical records. All institute parameters compliant.',
    },
    {
      id: 'stg-2',
      releaseRequestId: 'rel-1',
      office: 'APPROVAL_BUREAU',
      sequence: 2,
      status: 'IN_REVIEW',
      enteredAt: '2026-10-19T15:00:00Z',
      slaHours: 120,
      actorName: 'Bureau Officer Desk',
      isOverdue: false,
    },
    {
      id: 'stg-3',
      releaseRequestId: 'rel-1',
      office: 'GRIEVANCE_CELL',
      sequence: 3,
      status: 'PENDING',
      enteredAt: '2026-10-19T15:00:00Z',
      slaHours: 120,
    },
    {
      id: 'stg-4',
      releaseRequestId: 'rel-1',
      office: 'VIGILANCE_CELL',
      sequence: 4,
      status: 'PENDING',
      enteredAt: '2026-10-19T15:00:00Z',
      slaHours: 168,
    },
    {
      id: 'stg-5',
      releaseRequestId: 'rel-1',
      office: 'COMPETENT_AUTHORITY',
      sequence: 5,
      status: 'PENDING',
      enteredAt: '2026-10-19T15:00:00Z',
      slaHours: 72,
    },
  ]

  return (
    <div className="space-y-8 pb-12 page-enter">
      <PageHeader
        title="Design System & Statutory Component Gallery"
        description="Regulator-grade design system tokens, WCAG AA compliance, multi-office stage ribbons, trust verification levels, and signature interactions."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => setConfirmOpen(true)}
            >
              Test Confirm Dialog
            </Button>
            <Button
              variant="primary"
              size="default"
              leftIcon={<Bell className="w-4 h-4" />}
              onClick={() =>
                toast({
                  title: 'Component Gallery Active',
                  description: 'All statutory tokens and shared primitives conform to PRD specification.',
                  type: 'success',
                })
              }
            >
              Trigger Notification Toast
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'regulatory', label: 'Statutory & Trust Primitives' },
          { id: 'kpis', label: 'KPIs & Summary Cards' },
          { id: 'stages', label: 'Multi-Office Stage Tracker' },
          { id: 'documents', label: 'Document Vault & Viewer' },
          { id: 'tokens', label: 'Tokens & Themes' },
        ]}
      />

      {/* SECTION 1: STATUTORY & TRUST PRIMITIVES */}
      {activeTab === 'regulatory' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-ink-900 mb-2">
              Trust Level Badges (3 Levels + Simulation Hatch Variant)
            </h3>
            <p className="text-xs text-ink-500 mb-4 leading-relaxed">
              Expresses the strict legal evidentiary trail. When sandbox bank simulators are active, a prominent hatched diagonal pattern with a [SIMULATION] tag is rendered.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrustBadge level="SUBMITTED" />
              <TrustBadge level="STAFF_VERIFIED" />
              <TrustBadge level="BANK_CONFIRMED" />
              <TrustBadge level="BANK_CONFIRMED" isSimulated={true} />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink-900 mb-2">
              Statutory Lien Endorsement Badges
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Tracks formal bank hypothecation / lien status in favour of the Member Secretary, AICTE.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <LienBadge status="NOT_MARKED" />
              <LienBadge status="MARKED" referenceNumber="AICTE/LIEN/2026/089" />
              <LienBadge status="CONFIRMED" referenceNumber="SBI/SFMS/LIEN/7721" />
              <LienBadge status="RELEASED" />
              <LienBadge status="INVOKED" />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink-900 mb-2">
              Maturity Countdown Chips (Amber &lt; 60d, Red &lt; 15d)
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Deterministic date math using tabular monospace numerals.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <CountdownChip daysLeft={120} />
              <CountdownChip daysLeft={45} />
              <CountdownChip daysLeft={12} />
              <CountdownChip daysLeft={0} />
              <CountdownChip daysLeft={-8} />
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: KPIS & SUMMARY CARDS */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">
              KPI Cards with Subtle Hover Tilt & Glare
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Restrained 3D perspective applied on hover. Every metric is clickable to trigger drill-down.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Active Deposits"
                value="₹ 45.8 Cr"
                subtext="148 instruments in safe custody"
                icon={Landmark}
                tone="default"
                trend="+8.2% YoY"
                onClick={() => alert('Drilldown to Active Deposits')}
              />
              <KPICard
                title="Expiring Soon"
                value="14"
                subtext="Maturing within next 60 days"
                tone="warning"
                trend="Action Needed"
                onClick={() => alert('Drilldown to Expiring Soon')}
              />
              <KPICard
                title="Critical / Overdue"
                value="3"
                subtext="Past maturity without renewal"
                tone="danger"
                trend="Escalated"
                onClick={() => alert('Drilldown to Critical Overdue')}
              />
              <KPICard
                title="Verified Deposits"
                value="94.2%"
                subtext="AICTE or SFMS bank-confirmed"
                tone="success"
                trend="Compliant"
                onClick={() => alert('Drilldown to Verified')}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MULTI-OFFICE STAGE TRACKER */}
      {activeTab === 'stages' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">
              5-Office Sequential Consensus Ribbon
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Simulates the full institutional deposit release flow across Regional Office, Approval Bureau, Grievance Cell, Vigilance Cell, and Competent Authority.
            </p>
            <StageTracker
              stages={sampleStages}
              currentStageOffice="APPROVAL_BUREAU"
              onSelectStage={(s) =>
                toast({
                  title: `Selected Desk: ${s.office}`,
                  description: `Status: ${s.status}. SLA: ${s.slaHours} hours. Remarks: ${s.actionRemarks || 'None yet'}`,
                  type: 'info',
                })
              }
            />
          </div>
        </div>
      )}

      {/* SECTION 4: DOCUMENT VIEWER */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">
              Statutory Evidence Vault & Document Viewer
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Tamper-evident document preview with authenticated download actions.
            </p>
            <DocumentViewer
              documents={[
                {
                  id: 'doc-1',
                  fileName: 'SBI_FDR_Receipt_99281.pdf',
                  fileSize: 420500,
                  fileType: 'application/pdf',
                  uploadedAt: '2026-10-20T08:00:00Z',
                  category: 'FDR Deposit Receipt',
                  version: 1,
                  url: '/mock/doc1.pdf',
                },
                {
                  id: 'doc-2',
                  fileName: 'Bank_Lien_Confirmation_Letter.pdf',
                  fileSize: 289100,
                  fileType: 'application/pdf',
                  uploadedAt: '2026-10-21T11:20:00Z',
                  category: 'Lien Endorsement',
                  version: 2,
                  url: '/mock/doc2.pdf',
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* SECTION 5: TOKENS & THEMES */}
      {activeTab === 'tokens' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-ink-900">
            Ink Navy Palette & Semantic Token Architecture
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-3 bg-navy-950 text-white rounded-md text-center">
              <div className="text-xs font-mono">navy-950</div>
              <div className="text-[10px] opacity-75">Brand Deep</div>
            </div>
            <div className="p-3 bg-navy-900 text-white rounded-md text-center">
              <div className="text-xs font-mono">navy-900</div>
              <div className="text-[10px] opacity-75">Brand Primary</div>
            </div>
            <div className="p-3 bg-navy-800 text-white rounded-md text-center">
              <div className="text-xs font-mono">navy-800</div>
              <div className="text-[10px] opacity-75">Brand Hover</div>
            </div>
            <div className="p-3 bg-navy-100 text-navy-950 rounded-md text-center border border-navy-200">
              <div className="text-xs font-mono">navy-100</div>
              <div className="text-[10px] opacity-75">Brand Subtle</div>
            </div>
            <div className="p-3 bg-surface text-ink-900 rounded-md text-center border border-line">
              <div className="text-xs font-mono">surface</div>
              <div className="text-[10px] opacity-75">Solid Surface</div>
            </div>
            <div className="p-3 bg-emerald-700 text-white rounded-md text-center">
              <div className="text-xs font-mono">success</div>
              <div className="text-[10px] opacity-75">Verified Level 3</div>
            </div>
          </div>
        </Card>
      )}

      {/* Confirm Dialog Preview */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          toast({
            title: 'Action Recorded in Audit Trail',
            description: 'The regulatory transaction was committed successfully.',
            type: 'success',
          })
        }}
        title="Approve Statutory Release"
        description="Are you sure you want to approve this security deposit release stage? This action will generate the encrypted AICTE Sanction Order and advance the case."
        confirmText="Approve & Sign Order"
        variant="primary"
      />
    </div>
  )
}
