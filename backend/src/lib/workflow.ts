import { prisma } from './prisma'
import { ConflictError, ForbiddenError } from './errors'
import { VerificationStatus, LifecycleStatus, AuthenticatedUser } from './types'

// Allowed transitions for Verification
const VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['VERIFIED', 'DISCREPANCY', 'REJECTED'],
  DISCREPANCY: ['SUBMITTED'],
  VERIFIED: [],
  REJECTED: [],
}

export function assertValidVerificationTransition(
  current: VerificationStatus,
  target: VerificationStatus
) {
  const allowed = VERIFICATION_TRANSITIONS[current] || []
  if (!allowed.includes(target)) {
    throw new ConflictError(
      `Invalid verification transition from '${current}' to '${target}'. Allowed transitions: [${allowed.join(', ')}]`
    )
  }
}

// Record workflow history in the database
export async function recordWorkflowTransition(params: {
  entityType: 'FDR' | 'RENEWAL' | 'RELEASE' | 'VERIFICATION'
  entityId: string
  previousStatus: string
  newStatus: string
  actor?: AuthenticatedUser
  remarks?: string
}) {
  return prisma.workflowHistory.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      actorId: params.actor?.id,
      actorName: params.actor?.name,
      actorRole: params.actor?.role,
      remarks: params.remarks,
    },
  })
}

// Separation of duties checks
export function assertSeparationOfDuties(params: {
  action: 'VERIFY' | 'APPROVE_RENEWAL' | 'APPROVE_RELEASE' | 'STAGE_ACTION'
  actorId: string
  submitterId?: string
  reviewerId?: string
}) {
  if (
    (params.action === 'VERIFY' || params.action === 'STAGE_ACTION') &&
    params.submitterId &&
    params.actorId === params.submitterId
  ) {
    throw new ForbiddenError(
      'Separation of Duties violation: The user who submitted the request cannot act on its regulatory review stages.'
    )
  }

  if (
    (params.action === 'APPROVE_RENEWAL' || params.action === 'APPROVE_RELEASE') &&
    params.reviewerId &&
    params.actorId === params.reviewerId
  ) {
    throw new ForbiddenError(
      'Separation of Duties violation: The reviewer of a request cannot also give the final approval.'
    )
  }
}

