import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Communication Failure',
  message = 'The regulatory registry service could not be reached. Please check your network connection or try again.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-rose-200/90 rounded-xl shadow-level-1',
        className
      )}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-3 border border-rose-200">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-950">{title}</h3>
      <p className="text-xs text-rose-800 max-w-md mt-1 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="default"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
          className="border-rose-200 text-rose-900 hover:bg-rose-50"
        >
          Retry Connection
        </Button>
      )}
    </div>
  )
}
