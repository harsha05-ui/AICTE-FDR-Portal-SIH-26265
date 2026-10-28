import React, { useRef, useState } from 'react'
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react'
import { DocumentItem } from '@/types'
import { cn } from '@/lib/utils'

export interface FileDropzoneProps {
  category: string
  accept?: string
  maxSizeMB?: number
  onUploadSuccess?: (doc: DocumentItem) => void
  onFileSelected?: (file: File, category: string) => void
  disabled?: boolean
  className?: string
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  category,
  accept = '.pdf,.png,.jpg,.jpeg',
  maxSizeMB = 5,
  onUploadSuccess,
  onFileSelected,
  disabled = false,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    setError(null)

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds regulatory ceiling of ${maxSizeMB} MB.`)
      return
    }

    setSelectedFile(file)
    if (onFileSelected) {
      onFileSelected(file, category)
    }

    if (onUploadSuccess) {
      const docItem: DocumentItem = {
        id: `local-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        category,
        url: URL.createObjectURL(file),
      }
      onUploadSuccess(docItem)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded bg-slate-50',
          'cursor-pointer transition-colors duration-fast text-center',
          isDragging
            ? 'border-navy-900 bg-blue-50/50'
            : 'border-slate-300 hover:border-navy-700 hover:bg-slate-100/60',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFile(e.target.files[0])
            }
          }}
          className="hidden"
        />

        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-navy-900 mb-2">
          <UploadCloud className="w-5 h-5" />
        </div>

        <p className="text-xs font-semibold text-slate-800">
          {selectedFile ? selectedFile.name : 'Click to select or drag document here'}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          PDF, PNG, JPG up to {maxSizeMB} MB ({category})
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          {error}
        </p>
      )}

      {selectedFile && (
        <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded text-xs">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-navy-800 shrink-0" />
            <span className="font-medium text-slate-800 truncate">{selectedFile.name}</span>
            <span className="text-[11px] text-slate-400">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for Upload</span>
          </div>
        </div>
      )}
    </div>
  )
}
