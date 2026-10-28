import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Check,
  RefreshCw
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileDropzone } from '@/components/forms/FileDropzone'
import { DocumentItem } from '@/types'
import { useToast } from '@/components/feedback/Toast'

interface OCRField {
  label: string
  extracted: string
  entered: string
  confidence: number
  matches: boolean
}

export const OCRPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [analyzing, setAnalyzing] = useState(false)
  const [hasScanned, setHasScanned] = useState(true)

  const [ocrFields] = useState<OCRField[]>([
    {
      label: 'FDR reference number',
      extracted: 'FDR/SBI/2023/88921',
      entered: 'FDR/SBI/2023/88921',
      confidence: 99.2,
      matches: true,
    },
    {
      label: 'Banking partner',
      extracted: 'State Bank of India',
      entered: 'State Bank of India',
      confidence: 98.5,
      matches: true,
    },
    {
      label: 'Branch location',
      extracted: 'Okhla Phase-III Industrial Area, New Delhi',
      entered: 'Okhla Phase-III, New Delhi',
      confidence: 94.1,
      matches: true,
    },
    {
      label: 'Principal amount',
      extracted: '₹ 1,50,00,000.00',
      entered: '₹ 1,50,00,000.00',
      confidence: 99.8,
      matches: true,
    },
    {
      label: 'Maturity date',
      extracted: '15 Apr 2028',
      entered: '15 Apr 2028',
      confidence: 96.4,
      matches: true,
    },
    {
      label: 'Lien endorsement',
      extracted: 'Lien marked in favour of Member Secretary, AICTE, New Delhi',
      entered: 'Yes (Lien Inscribed)',
      confidence: 91.2,
      matches: true,
    },
  ])

  const handleDocumentUploaded = (_doc: DocumentItem) => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setHasScanned(true)
      toast({
        title: 'OCR extraction complete',
        description: 'Candidate fields extracted with 96.5% weighted confidence.',
        type: 'info',
      })
    }, 800)
  }

  const handleApplyToForm = () => {
    toast({
      title: 'Candidate values accepted',
      description: 'Proceeding to prefill registration form.',
      type: 'success',
    })
    navigate('/fdrs/new')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document OCR Extraction"
        description="Assisted document ingestion • Optical Character Recognition extracts candidate parameters for verification."
      />

      {/* Advisory Notice */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-950 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-medium text-amber-900">Advisory: OCR output is non-binding</p>
          <p className="text-amber-800 leading-relaxed">
            In accordance with regulatory guidelines, OCR extraction is purely advisory. Formal authentication requires SFMS Core Banking confirmation or verified officer review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Document Scanner / Uploader */}
        <div className="space-y-4">
          <Card className="space-y-3.5">
            <h2 className="text-xs font-semibold text-ink-900 pb-2 border-b border-line flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-ink-700" />
              <span>Document scan source</span>
            </h2>

            <FileDropzone
              category="FDR Certificate"
              onUploadSuccess={handleDocumentUploaded}
            />

            {analyzing ? (
              <div className="p-4 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-ink-700" />
                <p className="text-xs font-medium text-ink-900">
                  Extracting parameters...
                </p>
              </div>
            ) : hasScanned && (
              <div className="p-3 bg-canvas rounded-md border border-line space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Scan quality:</span>
                  <span className="font-medium text-emerald-800 tabular-nums">96.5% High quality</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Engine:</span>
                  <span className="font-mono text-ink-900">AICTE-OCR v2.4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-500">Watermark:</span>
                  <span className="text-emerald-800 font-medium">Detected</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right 2 Columns: Candidate Fields & Comparison */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-line">
              <div>
                <h2 className="text-xs font-semibold text-ink-900">
                  Extracted candidate fields
                </h2>
                <p className="text-[11px] text-ink-500">
                  Review extracted parameters before accepting
                </p>
              </div>
              <Button
                variant="primary"
                size="compact"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleApplyToForm}
              >
                Prefill registration
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas text-ink-500 font-medium">
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Candidate output</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ocrFields.map((field, idx) => (
                    <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-ink-900">{field.label}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-ink-900 tabular-nums">
                        {field.extracted}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            field.confidence > 95
                              ? 'text-emerald-700 font-medium'
                              : 'text-amber-700 font-medium'
                          }`}
                        >
                          {field.confidence}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2.5 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-ink-500">
                Extracted fields validated against banking character sets.
              </span>
              <Button
                variant="secondary"
                size="compact"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={handleApplyToForm}
              >
                Proceed to review
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
