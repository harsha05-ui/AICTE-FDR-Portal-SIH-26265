import React from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/glass/GlassSurface'

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError()
  const navigate = useNavigate()

  let errorMessage = 'An unexpected application error occurred while processing this request.'
  let errorTitle = 'System Application Error'

  if (isRouteErrorResponse(error)) {
    errorTitle = `${error.status} - ${error.statusText}`
    errorMessage = error.data?.message || error.statusText
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <GlassSurface variant="card" className="max-w-lg w-full p-8 text-center rounded-lg shadow-level-2 border border-line">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">{errorTitle}</h1>
        <p className="text-xs text-ink-500 mt-2 mb-4 leading-relaxed">
          The AICTE portal encountered an unexpected issue while rendering this section.
        </p>

        {errorMessage && (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded text-left font-mono text-[11px] text-rose-900 mb-6 overflow-x-auto max-h-32">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="default"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button
            variant="primary"
            size="default"
            leftIcon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </div>
      </GlassSurface>
    </div>
  )
}
