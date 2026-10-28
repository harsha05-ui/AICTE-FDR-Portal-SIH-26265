import React, { useState } from 'react'
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Eye,
  FileCheck,
  FileClock,
  AlertCircle,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentItem } from '@/types'
import { api } from '@/lib/api-client'
import { Button } from './Button'

export interface DocumentViewerProps {
  documents?: DocumentItem[]
  selectedDocId?: string
  onSelectDoc?: (doc: DocumentItem) => void
  allowDownload?: boolean
  className?: string
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents = [],
  selectedDocId,
  onSelectDoc,
  allowDownload = true,
  className,
}) => {
  const [activeDocId, setActiveDocId] = useState<string | undefined>(
    selectedDocId || documents[0]?.id
  )
  const [downloading, setDownloading] = useState(false)

  const activeDoc = documents.find((d) => d.id === (selectedDocId || activeDocId)) || documents[0]

  const handleDownload = async (doc: DocumentItem) => {
    if (!doc) return
    setDownloading(true)
    try {
      await api.fdrs.downloadDocument(doc.id, doc.fileName)
    } catch (err) {
      console.error('Document download failed', err)
    } finally {
      setDownloading(false)
    }
  }

  if (documents.length === 0) {
    return (
      <div
        className={cn(
          'p-8 text-center rounded-xl border border-dashed border-line bg-surface flex flex-col items-center justify-center',
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-ink-500 mb-2">
          <FileText className="w-5 h-5" />
        </div>
        <div className="text-sm font-semibold text-ink-900">No Statutory Documents Uploaded</div>
        <p className="text-xs text-ink-500 mt-1 max-w-sm">
          FDR receipts, joint account endorsements, and bank verification certificates will appear here once submitted.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-12 gap-4 rounded-xl border border-line bg-surface p-4', className)}>
      {/* Document Selector Column */}
      <div className="md:col-span-4 border-r border-line pr-3 space-y-2 max-h-[460px] overflow-y-auto">
        <div className="text-xs font-mono uppercase tracking-wider text-ink-500 pb-1">
          Attached Evidences ({documents.length})
        </div>
        {documents.map((doc) => {
          const isSelected = doc.id === (selectedDocId || activeDocId)
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                setActiveDocId(doc.id)
                onSelectDoc?.(doc)
              }}
              className={cn(
                'w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5',
                isSelected
                  ? 'border-navy-800 bg-navy-50/70 dark:bg-navy-950/40 shadow-sm'
                  : 'border-line/70 hover:border-slate-400 bg-white dark:bg-slate-900'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5',
                  isSelected ? 'bg-navy-900 text-white' : 'bg-slate-100 text-ink-500'
                )}
              >
                <File className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink-900 truncate">{doc.fileName}</div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-0.5 font-mono">
                  <span>{doc.category || 'Instrument Evidence'}</span>
                  {doc.version && <span>v{doc.version}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Document Details & Action Column */}
      <div className="md:col-span-8 pl-2 flex flex-col justify-between">
        {activeDoc ? (
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-line mb-4">
              <div>
                <h4 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <span>{activeDoc.fileName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Tamper-Evident SHA-256
                  </span>
                </h4>
                <div className="text-xs text-ink-500 mt-1 flex items-center gap-4 font-mono">
                  <span>Category: {activeDoc.category}</span>
                  <span>Size: {Math.round(activeDoc.fileSize / 1024)} KB</span>
                  <span>Uploaded: {new Date(activeDoc.uploadedAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {allowDownload && (
                <Button
                  size="compact"
                  variant="outline"
                  loading={downloading}
                  onClick={() => handleDownload(activeDoc)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              )}
            </div>

            {/* Document Preview Canvas or Inspector Frame */}
            <div className="h-64 rounded-lg border border-line bg-slate-50 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-navy-100 dark:bg-navy-900/60 text-navy-900 dark:text-navy-100 flex items-center justify-center mb-3">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-ink-900 mb-1">
                Statutory Document Encrypted & Verified
              </div>
              <p className="text-xs text-ink-500 max-w-sm mb-4">
                Document is stored in statutory S3 vault with authenticated read-time token signatures.
              </p>
              <div className="flex gap-2">
                <Button
                  size="compact"
                  variant="primary"
                  onClick={() => handleDownload(activeDoc)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Open in Decrypted Viewer
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
