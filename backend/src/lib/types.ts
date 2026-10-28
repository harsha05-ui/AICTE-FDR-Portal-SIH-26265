export const ROLES = ['INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const VERIFICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'DISCREPANCY',
  'REJECTED',
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const LIFECYCLE_STATUSES = [
  'ACTIVE',
  'EXPIRING',
  'MATURED',
  'RENEWED',
  'RELEASED',
] as const
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number]

export const RENEWAL_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED'] as const
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number]

export const RENEWAL_TYPES = ['RENEWAL', 'REPLACEMENT'] as const
export type RenewalType = (typeof RENEWAL_TYPES)[number]

export const RELEASE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'DECLINED',
  'COMPLETED',
] as const
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number]

export const TRUST_LEVELS = ['SUBMITTED', 'STAFF_VERIFIED', 'BANK_CONFIRMED'] as const
export type TrustLevel = (typeof TRUST_LEVELS)[number]

export const LIEN_STATUSES = [
  'NOT_RECORDED',
  'CLAIMED_BY_INSTITUTION',
  'CONFIRMED_BY_STAFF',
  'CONFIRMED_BY_BANK',
] as const
export type LienStatus = (typeof LIEN_STATUSES)[number]

export const INSTRUMENT_TYPES = [
  'FDR',
  'SECURITY_DEPOSIT',
  'RTGS_DEPOSIT',
  'BANK_GUARANTEE',
] as const
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number]

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const DOCUMENT_TYPES = [
  'FDR_CERTIFICATE',
  'LIEN_LETTER',
  'JOINT_MANDATE',
  'OTHER',
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const OFFICES = [
  'REGIONAL_OFFICE',
  'APPROVAL_BUREAU',
  'GRIEVANCE_CELL',
  'VIGILANCE_CELL',
  'COMPETENT_AUTHORITY',
] as const
export type Office = (typeof OFFICES)[number]

export const STAGE_STATUSES = [
  'PENDING',
  'ACTIVE',
  'APPROVED',
  'REJECTED',
  'RETURNED',
] as const
export type StageStatus = (typeof STAGE_STATUSES)[number]

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: Role
  office?: Office | string | null
  institutionId?: string | null
  institutionName?: string | null
  designation?: string | null
  department?: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

