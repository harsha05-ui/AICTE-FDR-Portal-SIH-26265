import { UserRole } from '@/types'

export type Permission =
  | 'fdr:view'
  | 'fdr:create'
  | 'fdr:edit_draft'
  | 'fdr:submit_review'
  | 'fdr:verify'
  | 'fdr:flag_discrepancy'
  | 'fdr:request_renewal'
  | 'fdr:request_release'
  | 'fdr:decide_request'
  | 'fdr:execute_release'
  | 'institution:view'
  | 'institution:manage'
  | 'reports:export'
  | 'audit:view'
  | 'ocr:use'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  INSTITUTION_USER: [
    'fdr:view',
    'fdr:create',
    'fdr:edit_draft',
    'fdr:submit_review',
    'fdr:request_renewal',
    'fdr:request_release',
    'institution:view',
    'ocr:use',
  ],
  REVIEWER: [
    'fdr:view',
    'fdr:verify',
    'fdr:flag_discrepancy',
    'fdr:decide_request',
    'institution:view',
    'reports:export',
    'audit:view',
    'ocr:use',
  ],
  APPROVER: [
    'fdr:view',
    'fdr:verify',
    'fdr:flag_discrepancy',
    'fdr:decide_request',
    'fdr:execute_release',
    'institution:view',
    'reports:export',
    'audit:view',
    'ocr:use',
  ],
  ADMIN: [
    'fdr:view',
    'fdr:create',
    'fdr:edit_draft',
    'fdr:submit_review',
    'fdr:verify',
    'fdr:flag_discrepancy',
    'fdr:request_renewal',
    'fdr:request_release',
    'fdr:decide_request',
    'fdr:execute_release',
    'institution:view',
    'institution:manage',
    'reports:export',
    'audit:view',
    'ocr:use',
  ],
  AICTE_OFFICIAL: [
    'fdr:view',
    'fdr:verify',
    'fdr:flag_discrepancy',
    'fdr:decide_request',
    'fdr:execute_release',
    'institution:view',
    'reports:export',
    'audit:view',
    'ocr:use',
  ],
  AICTE_ADMIN: [
    'fdr:view',
    'fdr:create',
    'fdr:edit_draft',
    'fdr:submit_review',
    'fdr:verify',
    'fdr:flag_discrepancy',
    'fdr:request_renewal',
    'fdr:request_release',
    'fdr:decide_request',
    'fdr:execute_release',
    'institution:view',
    'institution:manage',
    'reports:export',
    'audit:view',
    'ocr:use',
  ],
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function isOfficial(role: UserRole | undefined): boolean {
  return role === 'AICTE_OFFICIAL' || role === 'AICTE_ADMIN'
}
