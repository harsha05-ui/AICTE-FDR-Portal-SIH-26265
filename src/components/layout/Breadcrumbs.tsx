import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  fdrs: 'FDR Registry',
  new: 'Register Instrument',
  institutions: 'Institutions',
  verification: 'Verification Queue',
  renewals: 'Renewals & Transfer',
  releases: 'Release & Refund',
  reports: 'Reports & Reconciliation',
  audit: 'Audit Log',
  ocr: 'OCR Verification',
  styleguide: 'Style Reference',
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter(Boolean)

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center text-xs text-ink-500">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-navy-900 transition-colors"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`
        const isLast = index === pathnames.length - 1
        const label = ROUTE_LABELS[segment] || segment

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 opacity-40 shrink-0" aria-hidden="true" />
            {isLast ? (
              <span className="font-semibold text-ink-900 truncate max-w-[150px] sm:max-w-[200px]" aria-current="page">
                {label}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-navy-900 transition-colors truncate max-w-[120px]">
                {label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
