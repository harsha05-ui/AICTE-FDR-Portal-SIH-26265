import React from 'react'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/glass/GlassSurface'

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <GlassSurface variant="card" className="max-w-md w-full p-8 text-center rounded-lg shadow-level-2">
        <div className="w-12 h-12 rounded-full bg-canvas text-ink-500 flex items-center justify-center mx-auto mb-4 border border-line">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">404 - Registry Page Not Found</h1>
        <p className="text-xs text-ink-500 mt-2 mb-6 leading-relaxed">
          The requested compliance route or instrument record does not exist or has been relocated within the AICTE registry hierarchy.
        </p>
        <Button
          variant="primary"
          size="default"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Registry Dashboard
        </Button>
      </GlassSurface>
    </div>
  )
}
