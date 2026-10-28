import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'danger'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: ToastType
}

interface ToastContextType {
  toast: (options: { title: string; description?: string; type?: ToastType; duration?: number }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({
      title,
      description,
      type = 'info',
      duration = 4000,
    }: {
      title: string
      description?: string
      type?: ToastType
      duration?: number
    }) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: ToastMessage = { id, title, description, type }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const mappedType = t.type === 'danger' ? 'error' : t.type
          const Icon = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[mappedType]

          const colors = {
            success: 'border-emerald-200 bg-surface text-emerald-900',
            error: 'border-rose-200 bg-surface text-rose-900',
            warning: 'border-amber-200 bg-surface text-amber-900',
            info: 'border-navy-100 bg-surface text-navy-950',
          }[mappedType]

          const iconColors = {
            success: 'text-success',
            error: 'text-danger',
            warning: 'text-warning',
            info: 'text-navy-700',
          }[mappedType]

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto p-4 border rounded-md shadow-level-2 toast-enter flex items-start gap-3',
                colors
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColors)} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-ink-700 mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-ink-500 hover:text-ink-900 transition-colors p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
