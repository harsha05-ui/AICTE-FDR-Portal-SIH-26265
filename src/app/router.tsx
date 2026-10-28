import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { RouteGuard } from '@/features/auth/RouteGuard'
import { LoginPage } from '@/features/auth/LoginPage'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { NotFoundPage } from '@/features/auth/NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { FDRListPage } from '@/features/fdrs/FDRListPage'
import { NewFDRPage } from '@/features/fdrs/NewFDRPage'
import { FDRDetailPage } from '@/features/fdrs/FDRDetailPage'
import { InstitutionListPage } from '@/features/institutions/InstitutionListPage'
import { InstitutionDetailPage } from '@/features/institutions/InstitutionDetailPage'
import { VerificationListPage } from '@/features/verification/VerificationListPage'
import { VerificationDeskPage } from '@/features/verification/VerificationDeskPage'
import { RenewalPage } from '@/features/renewals/RenewalPage'
import { ReleasePage } from '@/features/releases/ReleasePage'
import { NotificationListPage } from '@/features/notifications/NotificationListPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { OCRPage } from '@/features/ocr/OCRPage'
import { StyleGuidePage } from '@/features/styleguide/StyleGuidePage'
import { HoldsPage } from '@/features/holds/HoldsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ImportPage } from '@/features/import/ImportPage'
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: (
      <RouteGuard>
        <Shell />
      </RouteGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'fdrs',
        element: <FDRListPage />,
      },
      {
        path: 'fdrs/new',
        element: (
          <RouteGuard allowedRoles={['INSTITUTION_USER']}>
            <NewFDRPage />
          </RouteGuard>
        ),
      },
      {
        path: 'fdrs/:id',
        element: <FDRDetailPage />,
      },
      {
        path: 'institutions',
        element: (
          <RouteGuard allowedRoles={['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN']}>
            <InstitutionListPage />
          </RouteGuard>
        ),
      },
      {
        path: 'institutions/:id',
        element: (
          <RouteGuard allowedRoles={['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN']}>
            <InstitutionDetailPage />
          </RouteGuard>
        ),
      },
      {
        path: 'verification',
        element: (
          <RouteGuard allowedRoles={['REVIEWER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN']}>
            <VerificationListPage />
          </RouteGuard>
        ),
      },
      {
        path: 'verification/:id',
        element: (
          <RouteGuard allowedRoles={['REVIEWER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN']}>
            <VerificationDeskPage />
          </RouteGuard>
        ),
      },
      {
        path: 'renewals',
        element: <RenewalPage />,
      },
      {
        path: 'releases',
        element: <ReleasePage />,
      },
      {
        path: 'notifications',
        element: <NotificationListPage />,
      },
      {
        path: 'reports',
        element: (
          <RouteGuard allowedRoles={['REVIEWER', 'APPROVER', 'ADMIN', 'AICTE_OFFICIAL', 'AICTE_ADMIN']}>
            <ReportsPage />
          </RouteGuard>
        ),
      },
      {
        path: 'audit',
        element: (
          <RouteGuard allowedRoles={['ADMIN', 'AICTE_ADMIN']}>
            <AuditPage />
          </RouteGuard>
        ),
      },
      {
        path: 'holds',
        element: (
          <RouteGuard allowedRoles={['APPROVER', 'ADMIN', 'AICTE_ADMIN']}>
            <HoldsPage />
          </RouteGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RouteGuard allowedRoles={['ADMIN', 'AICTE_ADMIN']}>
            <SettingsPage />
          </RouteGuard>
        ),
      },
      {
        path: 'import',
        element: (
          <RouteGuard allowedRoles={['ADMIN', 'AICTE_ADMIN']}>
            <ImportPage />
          </RouteGuard>
        ),
      },
      {
        path: 'ocr',
        element: <OCRPage />,
      },
      {
        path: 'styleguide',
        element: (
          <RouteGuard allowedRoles={['ADMIN', 'AICTE_ADMIN']}>
            <StyleGuidePage />
          </RouteGuard>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
