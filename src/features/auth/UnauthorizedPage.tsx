import React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { GlassSurface } from '@/components/glass/GlassSurface'

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <GlassSurface variant="card" className="max-w-md w-full p-8 text-center rounded-lg shadow-level-2">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-danger flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-ink-900">Access Restricted</h1>
        <p className="text-xs text-ink-500 mt-2 mb-6 leading-relaxed">
          Your current user credentials do not have the required regulatory clearance to access this compliance workflow or administrative dataset.
        </p>
        <Button
          variant="primary"
          size="default"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </GlassSurface>
    </div>
  )
}
