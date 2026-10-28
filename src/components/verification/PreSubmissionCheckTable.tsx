import React from 'react'
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PrecheckResponse } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

interface PreSubmissionCheckTableProps {
  precheck: PrecheckResponse | null
  isLoading?: boolean
  onFixField?: (step: number) => void
  readOnly?: boolean
}

const FIELD_LABELS: Record<string, { label: string; step: number }> = {
  referenceNumber: { label: 'Instrument / FDR Number', step: 1 },
  depositorName: { label: 'Depositor / Institution Name', step: 1 },
  bankName: { label: 'Commercial Bank', step: 1 },
  branchName: { label: 'Branch Name', step: 1 },
  ifscCode: { label: 'IFSC Code', step: 1 },
  depositAmount: { label: 'Deposit Amount (INR)', step: 1 },
  issueDate: { label: 'Deposit / Issue Date', step: 1 },
  maturityDate: { label: 'Maturity Date', step: 1 },
  lienWording: { label: 'Lien Endorsement Wording', step: 2 },
}

export const PreSubmissionCheckTable: React.FC<PreSubmissionCheckTableProps> = ({
  precheck,
  isLoading = false,
  onFixField,
  readOnly = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-ink-500 bg-surface border border-line rounded-md">
        Evaluating pre-submission statutory gate and cross-matching documents...
      </div>
    )
  }

  if (!precheck) {
    return (
      <div className="p-6 text-center text-xs text-ink-500 bg-surface border border-line rounded-md">
        Pre-submission verification report is not yet generated. Complete details and upload documents to evaluate.
      </div>
    )
  }

  const {
    canSubmit = false,
    gateMode = 'STRICT_BANK_RECEIPT',
    blockers = [],
    checks = [],
    bankReceipt = null,
    extractions = {},
  } = precheck

  const safeExtractions = extractions || {}

  // Extract certificate and bank letter data from extractions
  const certFields = safeExtractions['FDR_CERTIFICATE']?.extractedFields || {}
  const bankDocFields = safeExtractions['BANK_CONFIRMATION_LETTER']?.extractedFields || {}

  const fieldChecks = (checks || []).filter((c) => c.checkType === 'FIELD_MATCH')
  const slotChecks = (checks || []).filter((c) => c.checkType === 'DOCUMENT_SLOTS')

  const renderStatus = (status: string) => {
    switch (status) {
      case 'MATCH':
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Match</span>
          </span>
        )
      case 'MISMATCH':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>Mismatch</span>
          </span>
        )
      case 'NOT_FOUND':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>Not found</span>
          </span>
        )
    }
  }

  const formatValue = (fieldKey: string, val: any) => {
    if (val === undefined || val === null || val === '') return '—'
    if (fieldKey === 'depositAmount') {
      const num = Number(val)
      return isNaN(num) ? String(val) : `₹${formatCurrency(num)}`
    }
    if (fieldKey === 'issueDate' || fieldKey === 'maturityDate') {
      return formatDate(String(val))
    }
    return String(val)
  }

  return (
    <div className="space-y-4">
      {/* Gate Mode Status Banner */}
      <div
        className={`p-3.5 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
          gateMode === 'STRICT_BANK_RECEIPT'
            ? 'bg-surface border-line text-ink-900'
            : 'bg-amber-50/60 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-ink-700 shrink-0" />
          <span className="text-xs text-ink-700">
            <strong className="font-semibold text-ink-900">Enforced gate:</strong>{' '}
            {gateMode === 'STRICT_BANK_RECEIPT'
              ? 'Strict bank receipt (Core banking confirmation required)'
              : 'Document only (Bank confirmation pending)'}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full text-xs ${
            canSubmit
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${canSubmit ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          <span>{canSubmit ? 'Ready to submit' : 'Blocked'}</span>
        </span>
      </div>

      {/* Blockers alert panel if blocked */}
      {!canSubmit && blockers.length > 0 && (
        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-md text-xs text-rose-950 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Pre-submission blockers ({blockers.length})</span>
          </div>
          <p className="text-rose-800 text-xs">
            The following items must be resolved before this instrument can be submitted:
          </p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-rose-900">
            {blockers.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Required Document Slots Status */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
          <FileText className="w-4 h-4 text-ink-700" />
          <span>Required document slot audit</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {slotChecks.map((slot) => {
            const isOk = slot.status === 'PASSED'
            const ext = safeExtractions[slot.field]
            return (
              <div
                key={slot.field}
                className={`p-3 rounded-md border text-xs space-y-1.5 transition-colors ${
                  isOk ? 'bg-surface border-line' : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900 text-xs truncate" title={slot.field}>
                    {slot.field.replace(/_/g, ' ')}
                  </span>
                  {isOk ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-ink-500">
                  {ext ? (
                    <span>
                      {ext.method} • {(ext.confidence * 100).toFixed(0)}% confidence
                    </span>
                  ) : (
                    <span className="text-rose-700">Not uploaded</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 4-Way Cross-Match Table */}
      <Card className="space-y-3 overflow-hidden p-0">
        <div className="flex items-center justify-between p-4 pb-3 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-ink-700" />
            <span>4-way parameter cross-check</span>
          </h3>
          <span className="text-xs text-ink-500">
            Form vs Certificate vs Bank letter vs Gateway
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-canvas text-xs font-medium text-ink-500">
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-3">Declared form value</th>
                <th className="py-2.5 px-3">Certificate scan</th>
                <th className="py-2.5 px-3">Bank confirmation</th>
                <th className="py-2.5 px-3">Bank gateway</th>
                <th className="py-2.5 px-3 text-center">Result</th>
                {!readOnly && onFixField && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(FIELD_LABELS).map(([fieldKey, meta]) => {
                const check = fieldChecks.find((c) => c.field === fieldKey)
                const status = check?.status || 'NOT_FOUND'
                const formVal = check?.details?.formValue
                const certVal = certFields[fieldKey] ?? check?.details?.certificateValue
                const bankDocVal = bankDocFields[fieldKey]
                const receiptVal = check?.details?.bankReceiptValue

                const isMismatch = status === 'MISMATCH' || status === 'NOT_FOUND'

                return (
                  <tr
                    key={fieldKey}
                    className={`hover:bg-canvas/50 transition-colors ${
                      isMismatch ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-medium text-ink-900">
                      {meta.label}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-900 tabular-nums">
                      {formatValue(fieldKey, formVal)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-700 tabular-nums">
                      {formatValue(fieldKey, certVal)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-700 tabular-nums">
                      {formatValue(fieldKey, bankDocVal)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-700 tabular-nums">
                      {formatValue(fieldKey, receiptVal)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderStatus(status)}
                    </td>
                    {!readOnly && onFixField && (
                      <td className="py-2.5 px-4 text-right">
                        {isMismatch && (
                          <Button
                            variant="ghost"
                            size="compact"
                            onClick={() => onFixField(meta.step)}
                            className="text-xs text-ink-900 hover:text-accent-primary p-1 h-auto"
                          >
                            <span>Fix</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bank Verification Receipt Card */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-700" />
            <span>Bank core receipt audit</span>
          </h3>
          {bankReceipt?.simulated && (
            <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900">
              Simulation record
            </span>
          )}
        </div>

        {bankReceipt ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-ink-500 block text-[11px]">Receipt reference</span>
              <span className="font-mono font-medium text-ink-900 block tabular-nums">{bankReceipt.receiptRef}</span>
            </div>
            <div>
              <span className="text-ink-500 block text-[11px]">Integration source</span>
              <span className="font-medium text-ink-900 block">
                {bankReceipt.source === 'LIVE'
                  ? 'Live SFMS integration'
                  : bankReceipt.source === 'MOCK'
                  ? 'Mock bank gateway'
                  : 'Manual paper confirmation'}
              </span>
            </div>
            <div>
              <span className="text-ink-500 block text-[11px]">Timestamp</span>
              <span className="font-mono text-ink-900 block tabular-nums">
                {formatDateTime(bankReceipt.receivedAt)}
              </span>
            </div>
            <div>
              <span className="text-ink-500 block text-[11px]">Receipt determination</span>
              <div className="mt-1">
                {bankReceipt.status === 'CONFIRMED' ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Confirmed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    <span>{bankReceipt.status}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-canvas border border-line rounded-md text-xs text-ink-500 text-center">
            {gateMode === 'DOCUMENT_ONLY'
              ? 'Bank core confirmation receipt is optional in document-only mode.'
              : 'No core banking receipt recorded. Run precheck verification to query banking gateway.'}
          </div>
        )}
      </Card>
    </div>
  )
}
