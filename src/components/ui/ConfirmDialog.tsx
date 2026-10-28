import React from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Dialog } from './Dialog'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}) => {
  const Icon = variant === 'danger' ? AlertTriangle : Info

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3.5 py-1">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'danger'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              : 'bg-navy-100 text-navy-900 dark:bg-navy-950 dark:text-navy-100'
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-ink-700 leading-relaxed">{description}</p>
        </div>
      </div>
    </Dialog>
  )
}
