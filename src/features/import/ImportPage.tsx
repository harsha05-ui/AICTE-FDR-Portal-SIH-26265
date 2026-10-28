import React, { useState } from 'react'
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/feedback/Toast'
import { formatINR, formatDate } from '@/lib/format'

export const ImportPage: React.FC = () => {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<{
    totalRows: number
    validRows: number
    errorRows: number
    errors: Array<{ row: number; field: string; message: string; data?: any }>
    preview?: any[]
  } | null>(null)

  const [committedCount, setCommittedCount] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setDryRunResult(null)
      setCommittedCount(null)
    }
  }

  const runDryRunValidation = async () => {
    if (!file) return
    setAnalyzing(true)
    setCommittedCount(null)
    try {
      const res = await api.import.instruments(file, true)
      setDryRunResult(res)
      if (res.errorRows === 0) {
        toast({
          title: 'Validation passed',
          description: `All ${res.validRows} rows conform to schema. Ready to commit.`,
          type: 'success',
        })
      } else {
        toast({
          title: 'Validation errors detected',
          description: `Found ${res.errorRows} errors out of ${res.totalRows} rows.`,
          type: 'warning',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Validation failed',
        description: err.message || 'Failed to parse CSV.',
        type: 'danger',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const commitImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const res = await api.import.instruments(file, false)
      setCommittedCount(res.insertedCount || res.validRows)
      toast({
        title: 'Batch import committed',
        description: `Imported ${res.insertedCount || res.validRows} instruments.`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Commit rejected',
        description: err.message || 'Import failed to commit.',
        type: 'danger',
      })
    } finally {
      setImporting(false)
    }
  }

  const downloadSampleCsv = () => {
    const csvContent =
      'fdrNumber,institutionCode,bankName,branchName,ifscCode,accountNumber,amount,interestRate,issueDate,maturityDate,jointAccount,lienMarked\n' +
      'FDR/SAMPLE/2026/001,1-10928371,State Bank of India,Main Branch,SBIN0008077,998877665544,10000000,7.25,2026-04-01,2031-04-01,true,true\n' +
      'FDR/SAMPLE/2026/002,1-10928371,Punjab National Bank,Connaught Place,PUNB0001200,112233445566,15000000,7.00,2026-05-01,2031-05-01,true,true\n'

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aicte_instruments_sample_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Batch Import"
        description="Onboarding of institutional deposit records with dry-run validation and row-level error reporting."
        action={
          <Button
            variant="secondary"
            size="default"
            onClick={downloadSampleCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download CSV template
          </Button>
        }
      />

      {/* Upload Zone */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-semibold text-ink-900">
          Upload deposit batch file (.csv)
        </h3>
        <div className="border border-dashed border-line rounded-lg p-6 flex flex-col items-center justify-center text-center bg-canvas">
          <div className="w-10 h-10 rounded-full bg-surface border border-line text-ink-700 flex items-center justify-center mb-2.5">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="text-xs font-medium text-ink-900 mb-1">
            {file ? file.name : 'Select or drag & drop a CSV batch file'}
          </div>
          <p className="text-[11px] text-ink-500 max-w-md mb-3">
            Supports UTF-8 CSV with columns: fdrNumber, institutionCode, bankName, branchName, ifscCode, accountNumber, amount, interestRate, issueDate, maturityDate.
          </p>

          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              Choose CSV file
            </Button>
            {file && (
              <Button
                variant="primary"
                size="default"
                loading={analyzing}
                onClick={runDryRunValidation}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Run dry-run validation
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Dry Run Pre-Validation Summary */}
      {dryRunResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-ink-500 font-medium block">Total inspected rows</span>
                <span className="text-2xl font-semibold font-mono text-ink-900 tabular-nums">
                  {dryRunResult.totalRows}
                </span>
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-ink-500 font-medium block">Valid compliant rows</span>
                <span className="text-2xl font-semibold font-mono text-emerald-700 tabular-nums">
                  {dryRunResult.validRows}
                </span>
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-ink-500 font-medium block">Row-level errors</span>
                <span className="text-2xl font-semibold font-mono text-rose-700 tabular-nums">
                  {dryRunResult.errorRows}
                </span>
              </div>
            </Card>
          </div>

          {/* Row-level error table */}
          {dryRunResult.errorRows > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Row validation exceptions ({dryRunResult.errorRows})</span>
              </div>
              <p className="text-xs text-ink-500">
                Correct the discrepancies in your CSV and re-validate before committing:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-line rounded-md">
                  <thead>
                    <tr className="bg-canvas text-ink-700 font-medium border-b border-line">
                      <th className="p-2.5 font-mono">Row</th>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Validation rule violated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dryRunResult.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-canvas/50">
                        <td className="p-2.5 font-mono text-ink-900 tabular-nums">{err.row}</td>
                        <td className="p-2.5 font-mono text-ink-900">{err.field}</td>
                        <td className="p-2.5 text-rose-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Valid rows preview & commit action */}
          {dryRunResult.validRows > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h4 className="text-xs font-semibold text-ink-900">
                    Compliant records ready for database ingestion ({dryRunResult.validRows})
                  </h4>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Committing will create active deposit records in the ledger.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="default"
                  loading={importing}
                  onClick={commitImport}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Commit {dryRunResult.validRows} records
                </Button>
              </div>

              {dryRunResult.preview && dryRunResult.preview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-line rounded-md">
                    <thead>
                      <tr className="bg-canvas text-ink-500 font-medium border-b border-line">
                        <th className="p-2.5">FDR Number</th>
                        <th className="p-2.5">Bank Name</th>
                        <th className="p-2.5">Branch</th>
                        <th className="p-2.5">Amount (INR)</th>
                        <th className="p-2.5">Maturity Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dryRunResult.preview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-canvas/50">
                          <td className="p-2.5 font-mono text-ink-900 tabular-nums">{row.fdrNumber}</td>
                          <td className="p-2.5 text-ink-800">{row.bankName}</td>
                          <td className="p-2.5 text-ink-500">{row.branchName}</td>
                          <td className="p-2.5 font-mono text-ink-900 tabular-nums">{formatINR(row.amount)}</td>
                          <td className="p-2.5 font-mono text-ink-700 tabular-nums">{formatDate(row.maturityDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {committedCount !== null && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 text-emerald-950 rounded-md flex items-center gap-2.5 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-emerald-900 block">Batch committed successfully</span>
                <span className="text-emerald-800">
                  {committedCount} records inserted into registry.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
