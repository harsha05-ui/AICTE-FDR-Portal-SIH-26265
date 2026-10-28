import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { UserRole } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

export interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles) {
    const isAllowed = allowedRoles.some((allowed) => {
      if (allowed === user.role) return true
      if (allowed === 'AICTE_OFFICIAL' && (user.role === 'REVIEWER' || user.role === 'APPROVER' || user.role === 'ADMIN')) return true
      if (allowed === 'AICTE_ADMIN' && user.role === 'ADMIN') return true
      return false
    })

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
