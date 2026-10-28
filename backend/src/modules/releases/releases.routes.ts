import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../lib/errors'
import { param, serializeAmount } from '../../lib/params'
import { requireRole } from '../../middleware/auth'
import { assertSeparationOfDuties, recordWorkflowTransition } from '../../lib/workflow'
import { getSetting } from '../../lib/settings'
import { Office } from '../../lib/types'
import { generateAndSaveIssuedOrder, readAndDecryptOrderPdf } from '../../lib/orderPdf'

export const releasesRouter = Router()

// Demo Rules constants for statutory deposit release eligibility
export const DEMO_RELEASE_RULES = {
  REQUIRED_VERIFICATION_STATUS: 'VERIFIED',
  DISALLOW_OPEN_DISCREPANCY: true,
  REQUIRE_REVIEWER_PRIOR_TO_APPROVAL: true,
}

// GET /release-requests
releasesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {}
    if (req.user?.role === 'INSTITUTION_USER') {
      where.fdr = { institutionId: req.user.institutionId }
    }

    const list = await prisma.releaseRequest.findMany({
      where,
      include: {
        fdr: { include: { institution: true } },
        requester: true,
        stages: { orderBy: { order: 'asc' } },
        issuedOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = list.map((r) => ({
      id: r.id,
      fdrId: r.fdrId,
      fdrNumber: r.fdr.referenceNumber,
      institutionId: r.fdr.institutionId,
      institutionName: r.fdr.institution?.name || '',
      requestType: r.requestType,
      requestStatus: r.status,
      status: r.status,
      amount: serializeAmount(r.amount),
      submissionDate: r.createdAt.toISOString(),
      reasonForRelease: r.reason,
      reason: r.reason,
      councilApprovalRef: r.councilOrderRef || 'AICTE/EXC/2026/REL-401',
      councilOrderRef: r.councilOrderRef || 'AICTE/EXC/2026/REL-401',
      reviewedBy: r.reviewedBy || undefined,
      remarks: r.decisionRemarks || undefined,
      decisionRemarks: r.decisionRemarks || undefined,
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
      stages: r.stages,
      issuedOrder: r.issuedOrder || undefined,
    }))

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})

// Handler for creating release requests
export async function createReleaseRequestHandler(
  fdrId: string,
  data: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const fdr = await prisma.fDR.findUnique({
      where: { id: fdrId },
      include: { institution: true },
    })

    if (!fdr) throw new NotFoundError(`FDR ${fdrId} not found.`)

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot request release for another institution')
    }

    // Active Regulatory Hold Check (PRD R10: An active hold blocks creating a release request)
    const activeHold = await prisma.hold.findFirst({
      where: { institutionId: fdr.institutionId, active: true },
    })
    if (activeHold) {
      throw new ConflictError(
        `Statutory Release Blocked: Institution has an active regulatory hold (${activeHold.reason} - Ref: ${activeHold.referenceNo}).`
      )
    }

    // Demo Rule 1: Instrument must be VERIFIED
    if (fdr.verificationStatus !== DEMO_RELEASE_RULES.REQUIRED_VERIFICATION_STATUS) {
      throw new ConflictError(
        `Demo Rule Violation: Statutory release requires the instrument to be in '${DEMO_RELEASE_RULES.REQUIRED_VERIFICATION_STATUS}' status. Current status is '${fdr.verificationStatus}'.`
      )
    }

    // Demo Rule 2: No open discrepancies or high-risk flags
    let flags: string[] = []
    try {
      flags = fdr.flags ? JSON.parse(fdr.flags) : []
    } catch {
      flags = []
    }

    if (DEMO_RELEASE_RULES.DISALLOW_OPEN_DISCREPANCY && flags.length > 0) {
      throw new ConflictError(
        `Demo Rule Violation: Instrument has ${flags.length} open discrepancy flags (${flags.join(', ')}). Release is blocked until resolved.`
      )
    }

    const amount = data.amount ? Number(data.amount) : fdr.depositAmount
    const reason = data.reasonForRelease || data.reason || 'Completion of statutory lock-in period.'
    const councilOrderRef = data.councilApprovalRef || data.councilOrderRef || 'AICTE/EXC/2026/REL-401'

    // Load stage order and SLA days from settings
    const defaultStageOrder: Office[] = [
      'REGIONAL_OFFICE',
      'APPROVAL_BUREAU',
      'GRIEVANCE_CELL',
      'VIGILANCE_CELL',
      'COMPETENT_AUTHORITY',
    ]
    const stageOrder = await getSetting<Office[]>('release.stage_order', defaultStageOrder)
    const defaultSlaDays: Record<string, number> = {
      REGIONAL_OFFICE: 7,
      APPROVAL_BUREAU: 7,
      GRIEVANCE_CELL: 5,
      VIGILANCE_CELL: 5,
      COMPETENT_AUTHORITY: 3,
    }
    const slaDaysMap = await getSetting<Record<string, number>>('release.stage_sla_days', defaultSlaDays)

    const created = await prisma.$transaction(async (tx) => {
      const rel = await tx.releaseRequest.create({
        data: {
          fdrId: fdr.id,
          requestedBy: req.user!.id,
          requestType: data.requestType === 'REFUND' ? 'REFUND' : 'RELEASE',
          status: 'SUBMITTED',
          amount,
          reason,
          councilOrderRef,
        },
      })

      const now = new Date()
      for (let i = 0; i < stageOrder.length; i++) {
        const off = stageOrder[i]
        const sla = slaDaysMap[off] || 7
        const isFirst = i === 0

        await tx.releaseStage.create({
          data: {
            releaseRequestId: rel.id,
            office: off,
            order: i,
            status: isFirst ? 'ACTIVE' : 'PENDING',
            startedAt: isFirst ? now : null,
            dueAt: isFirst ? new Date(now.getTime() + sla * 24 * 3600 * 1000) : null,
          },
        })
      }

      return rel
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'CREATE_RELEASE_REQUEST',
        entityType: 'Release',
        entityId: created.id,
        changeSummary: `Requested deposit release of ₹${created.amount} for ${fdr.referenceNumber}. Initialized ${stageOrder.length} regulatory stages.`,
        metadata: JSON.stringify(created),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    const lienWarning =
      fdr.lienStatus !== 'CONFIRMED_BY_STAFF' && fdr.lienStatus !== 'CONFIRMED_BY_BANK'
        ? 'Lien has not been confirmed by AICTE staff or bank.'
        : undefined

    const fullCreated = await prisma.releaseRequest.findUnique({
      where: { id: created.id },
      include: { stages: { orderBy: { order: 'asc' } } },
    })

    res.status(201).json({
      id: created.id,
      fdrId: fdr.id,
      fdrNumber: fdr.referenceNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institution?.name,
      amount: serializeAmount(created.amount),
      requestStatus: created.status,
      status: created.status,
      submissionDate: created.createdAt.toISOString(),
      stages: fullCreated?.stages || [],
      lienWarning,
      warning: lienWarning,
    })
  } catch (err) {
    next(err)
  }
}

// POST /release-requests (compatibility route)
releasesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  createReleaseRequestHandler(req.body.fdrId, req.body, req, res, next)
})

// GET /release-requests/:id (Scoped: returns full case with stages and time spent per stage)
releasesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const release = await prisma.releaseRequest.findUnique({
      where: { id },
      include: {
        fdr: { include: { institution: true } },
        requester: true,
        stages: { orderBy: { order: 'asc' } },
        issuedOrder: true,
      },
    })

    if (!release) throw new NotFoundError(`Release request ${id} not found.`)

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== release.fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot view release request for another institution')
    }

    const now = new Date()
    let totalTimeSpentMs = 0

    const formattedStages = release.stages.map((st) => {
      let timeSpentHours = 0
      if (st.startedAt) {
        const endTime = st.completedAt ? new Date(st.completedAt).getTime() : now.getTime()
        const durationMs = Math.max(0, endTime - new Date(st.startedAt).getTime())
        timeSpentHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10
        totalTimeSpentMs += durationMs
      }

      return {
        id: st.id,
        office: st.office,
        order: st.order,
        status: st.status,
        assignedTo: st.assignedTo || undefined,
        remarks: st.remarks || undefined,
        dueAt: st.dueAt ? st.dueAt.toISOString() : undefined,
        startedAt: st.startedAt ? st.startedAt.toISOString() : undefined,
        completedAt: st.completedAt ? st.completedAt.toISOString() : undefined,
        timeSpentHours,
        actionById: st.actionById || undefined,
      }
    })

    const totalTimeSpentHours = Math.round((totalTimeSpentMs / (1000 * 60 * 60)) * 10) / 10

    res.json({
      id: release.id,
      fdrId: release.fdrId,
      fdrNumber: release.fdr.referenceNumber,
      institutionId: release.fdr.institutionId,
      institutionName: release.fdr.institution?.name || '',
      requestType: release.requestType,
      requestStatus: release.status,
      status: release.status,
      amount: serializeAmount(release.amount),
      submissionDate: release.createdAt.toISOString(),
      reasonForRelease: release.reason,
      reason: release.reason,
      councilApprovalRef: release.councilOrderRef || 'AICTE/EXC/2026/REL-401',
      councilOrderRef: release.councilOrderRef || 'AICTE/EXC/2026/REL-401',
      reviewedBy: release.reviewedBy || undefined,
      remarks: release.decisionRemarks || undefined,
      decisionRemarks: release.decisionRemarks || undefined,
      completedAt: release.completedAt ? release.completedAt.toISOString() : undefined,
      stages: formattedStages,
      totalTimeSpentHours,
      issuedOrder: release.issuedOrder || undefined,
    })
  } catch (err) {
    next(err)
  }
})

// GET /release-requests/:id/order (Scoped: returns decrypted official NOC / sanction order PDF)
releasesRouter.get('/:id/order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const release = await prisma.releaseRequest.findUnique({
      where: { id },
      include: {
        fdr: { include: { institution: true } },
        issuedOrder: true,
      },
    })

    if (!release) throw new NotFoundError(`Release request ${id} not found.`)

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== release.fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot view order for another institution')
    }

    if (!release.issuedOrder) {
      throw new NotFoundError(`No statutory order has been issued for release request ${id}.`)
    }

    const order = release.issuedOrder
    const pdfBuffer = readAndDecryptOrderPdf(order.filePath)

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        action: 'DOWNLOAD_STATUTORY_ORDER',
        entityType: 'IssuedOrder',
        entityId: order.id,
        changeSummary: `Downloaded statutory order ${order.referenceNo} (${order.type}).`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    const filename = `${order.referenceNo.replace(/[\/\\]/g, '_')}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
})

const stageActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'RETURN']),
  remarks: z.string().trim().min(3, 'Mandatory remarks are required for regulatory stage action'),
})

// POST /release-requests/:id/stages/:stageId/action (Office Reviewer, Approver, Admin)
releasesRouter.post(
  '/:id/stages/:stageId/action',
  requireRole('REVIEWER', 'APPROVER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = param(req, 'id')
      const stageId = param(req, 'stageId')
      const validated = stageActionSchema.parse(req.body)

      const release = await prisma.releaseRequest.findUnique({
        where: { id },
        include: {
          fdr: { include: { institution: true } },
          stages: { orderBy: { order: 'asc' } },
        },
      })

      if (!release) throw new NotFoundError(`Release request ${id} not found.`)

      const stage = release.stages.find((s) => s.id === stageId)
      if (!stage) throw new NotFoundError(`Release stage ${stageId} not found on this request.`)

      if (stage.status !== 'ACTIVE') {
        throw new ConflictError(`Cannot act on stage in '${stage.status}' status. Stage must be ACTIVE.`)
      }

      // Office check: Reviewer can only act on their assigned office stage unless ADMIN
      if (req.user?.role !== 'ADMIN' && req.user?.office !== stage.office) {
        throw new ForbiddenError(
          `Reviewer from office '${req.user?.office || 'Unassigned'}' cannot act on stage assigned to '${stage.office}'.`
        )
      }

      // Separation of duties: Submitter cannot act
      assertSeparationOfDuties({
        action: 'STAGE_ACTION',
        actorId: req.user!.id,
        submitterId: release.requestedBy,
      })

      const now = new Date()
      const isFinalStage = stage.order === release.stages.length - 1

      if (validated.action === 'APPROVE') {
        if (isFinalStage) {
          // Check for active regulatory hold before final approval
          const activeHold = await prisma.hold.findFirst({
            where: { institutionId: release.fdr.institutionId, active: true },
          })
          if (activeHold) {
            throw new ConflictError(
              `Final release approval blocked: Institution has an active regulatory hold (${activeHold.reason} - Ref: ${activeHold.referenceNo}).`
            )
          }

          const result = await prisma.$transaction(async (tx) => {
            const updatedStage = await tx.releaseStage.update({
              where: { id: stage.id },
              data: {
                status: 'APPROVED',
                completedAt: now,
                remarks: validated.remarks,
                actionById: req.user!.id,
              },
            })

            const updatedReq = await tx.releaseRequest.update({
              where: { id: release.id },
              data: {
                status: 'APPROVED',
                decision: 'APPROVED',
                decisionRemarks: validated.remarks,
                completedAt: now,
              },
            })

            await tx.fDR.update({
              where: { id: release.fdrId },
              data: { lifecycleStatus: 'RELEASED' },
            })

            return { updatedStage, updatedReq }
          })

          await recordWorkflowTransition({
            entityType: 'RELEASE',
            entityId: release.id,
            previousStatus: release.status,
            newStatus: 'APPROVED',
            actor: req.user,
            remarks: `Final stage [${stage.office}] approved: ${validated.remarks}`,
          })

          await prisma.auditLog.create({
            data: {
              actorId: req.user!.id,
              actorName: req.user!.name,
              actorRole: req.user!.role,
              action: 'APPROVE_RELEASE_FINAL_STAGE',
              entityType: 'Release',
              entityId: release.id,
              changeSummary: `Completed all statutory stages for release ${release.id}. Lifecycle set to RELEASED.`,
              metadata: JSON.stringify({ stage: result.updatedStage, remarks: validated.remarks }),
              ipAddress: req.ip || '127.0.0.1',
            },
          })

          const issuedOrder = await generateAndSaveIssuedOrder({
            releaseRequestId: release.id,
            issuedById: req.user!.id,
            issuedByName: req.user!.name,
            issuedByRole: req.user!.role,
          })

          res.json({
            id: release.id,
            requestStatus: 'APPROVED',
            stageId: stage.id,
            stageStatus: 'APPROVED',
            completed: true,
            orderReference: issuedOrder.referenceNo,
            orderType: issuedOrder.type,
            remarks: validated.remarks,
          })
        } else {
          // Progress to next stage
          const nextStage = release.stages.find((s) => s.order === stage.order + 1)
          const defaultSlaDays: Record<string, number> = {
            REGIONAL_OFFICE: 7,
            APPROVAL_BUREAU: 7,
            GRIEVANCE_CELL: 5,
            VIGILANCE_CELL: 5,
            COMPETENT_AUTHORITY: 3,
          }
          const slaDaysMap = await getSetting<Record<string, number>>('release.stage_sla_days', defaultSlaDays)
          const nextSla = nextStage ? slaDaysMap[nextStage.office] || 5 : 5

          const result = await prisma.$transaction(async (tx) => {
            const updatedStage = await tx.releaseStage.update({
              where: { id: stage.id },
              data: {
                status: 'APPROVED',
                completedAt: now,
                remarks: validated.remarks,
                actionById: req.user!.id,
              },
            })

            if (nextStage) {
              await tx.releaseStage.update({
                where: { id: nextStage.id },
                data: {
                  status: 'ACTIVE',
                  startedAt: now,
                  dueAt: new Date(now.getTime() + nextSla * 24 * 3600 * 1000),
                },
              })
            }

            const updatedReq = await tx.releaseRequest.update({
              where: { id: release.id },
              data: { status: 'UNDER_REVIEW' },
            })

            return { updatedStage, updatedReq, nextStageId: nextStage?.id }
          })

          await recordWorkflowTransition({
            entityType: 'RELEASE',
            entityId: release.id,
            previousStatus: release.status,
            newStatus: 'UNDER_REVIEW',
            actor: req.user,
            remarks: `Stage [${stage.office}] approved. Transitioned to next stage. Remarks: ${validated.remarks}`,
          })

          await prisma.auditLog.create({
            data: {
              actorId: req.user!.id,
              actorName: req.user!.name,
              actorRole: req.user!.role,
              action: 'APPROVE_RELEASE_STAGE',
              entityType: 'Release',
              entityId: release.id,
              changeSummary: `Stage [${stage.office}] approved. Advanced to next stage.`,
              metadata: JSON.stringify({ stage: result.updatedStage, nextStageId: result.nextStageId }),
              ipAddress: req.ip || '127.0.0.1',
            },
          })

          res.json({
            id: release.id,
            requestStatus: 'UNDER_REVIEW',
            stageId: stage.id,
            stageStatus: 'APPROVED',
            nextStageId: result.nextStageId,
            completed: false,
            remarks: validated.remarks,
          })
        }
      } else if (validated.action === 'REJECT') {
        const result = await prisma.$transaction(async (tx) => {
          const updatedStage = await tx.releaseStage.update({
            where: { id: stage.id },
            data: {
              status: 'REJECTED',
              completedAt: now,
              remarks: validated.remarks,
              actionById: req.user!.id,
            },
          })

          const updatedReq = await tx.releaseRequest.update({
            where: { id: release.id },
            data: {
              status: 'DECLINED',
              decision: 'DECLINED',
              decisionRemarks: validated.remarks,
              completedAt: now,
            },
          })

          return { updatedStage, updatedReq }
        })

        await recordWorkflowTransition({
          entityType: 'RELEASE',
          entityId: release.id,
          previousStatus: release.status,
          newStatus: 'DECLINED',
          actor: req.user,
          remarks: `Stage [${stage.office}] REJECTED: ${validated.remarks}`,
        })

        await prisma.auditLog.create({
          data: {
            actorId: req.user!.id,
            actorName: req.user!.name,
            actorRole: req.user!.role,
            action: 'REJECT_RELEASE_STAGE',
            entityType: 'Release',
            entityId: release.id,
            changeSummary: `Stage [${stage.office}] rejected. Release request set to DECLINED.`,
            metadata: JSON.stringify({ stage: result.updatedStage, remarks: validated.remarks }),
            ipAddress: req.ip || '127.0.0.1',
          },
        })

        res.json({
          id: release.id,
          requestStatus: 'DECLINED',
          stageId: stage.id,
          stageStatus: 'REJECTED',
          completed: true,
          remarks: validated.remarks,
        })
      } else {
        // RETURN to institution
        const result = await prisma.$transaction(async (tx) => {
          const updatedStage = await tx.releaseStage.update({
            where: { id: stage.id },
            data: {
              status: 'RETURNED',
              completedAt: now,
              remarks: validated.remarks,
              actionById: req.user!.id,
            },
          })

          const updatedReq = await tx.releaseRequest.update({
            where: { id: release.id },
            data: {
              status: 'RETURNED',
              decision: 'RETURNED',
              decisionRemarks: validated.remarks,
            },
          })

          return { updatedStage, updatedReq }
        })

        await recordWorkflowTransition({
          entityType: 'RELEASE',
          entityId: release.id,
          previousStatus: release.status,
          newStatus: 'RETURNED',
          actor: req.user,
          remarks: `Stage [${stage.office}] RETURNED to institution: ${validated.remarks}`,
        })

        await prisma.auditLog.create({
          data: {
            actorId: req.user!.id,
            actorName: req.user!.name,
            actorRole: req.user!.role,
            action: 'RETURN_RELEASE_STAGE',
            entityType: 'Release',
            entityId: release.id,
            changeSummary: `Stage [${stage.office}] returned to institution for regulatory clarification.`,
            metadata: JSON.stringify({ stage: result.updatedStage, remarks: validated.remarks }),
            ipAddress: req.ip || '127.0.0.1',
          },
        })

        res.json({
          id: release.id,
          requestStatus: 'RETURNED',
          stageId: stage.id,
          stageStatus: 'RETURNED',
          completed: false,
          remarks: validated.remarks,
        })
      }
    } catch (err) {
      next(err)
    }
  }
)

// POST /release-requests/:id/review (Two-tier backward compatibility: Reviewer only)
releasesRouter.post('/:id/review', requireRole('REVIEWER', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const { remarks } = req.body

    const release = await prisma.releaseRequest.findUnique({
      where: { id },
      include: { fdr: true, stages: { orderBy: { order: 'asc' } } },
    })

    if (!release) throw new NotFoundError(`Release request ${id} not found.`)

    if (release.status !== 'SUBMITTED') {
      throw new ConflictError(`Release request cannot be reviewed in '${release.status}' status.`)
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Mark active stage approved if stages exist
      const activeStage = release.stages.find((s) => s.status === 'ACTIVE')
      if (activeStage) {
        await tx.releaseStage.update({
          where: { id: activeStage.id },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
            remarks: remarks || 'Reviewed by Regional Bureau Reviewer',
            actionById: req.user!.id,
          },
        })
        const nextStage = release.stages.find((s) => s.order === activeStage.order + 1)
        if (nextStage) {
          await tx.releaseStage.update({
            where: { id: nextStage.id },
            data: { status: 'ACTIVE', startedAt: new Date() },
          })
        }
      }

      return tx.releaseRequest.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          reviewedBy: req.user!.id,
          decisionRemarks: remarks || 'Preliminary review completed by Regional Bureau Reviewer.',
        },
      })
    })

    await recordWorkflowTransition({
      entityType: 'RELEASE',
      entityId: release.id,
      previousStatus: release.status,
      newStatus: 'UNDER_REVIEW',
      actor: req.user,
      remarks,
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'REVIEW_RELEASE_REQUEST',
        entityType: 'Release',
        entityId: release.id,
        changeSummary: `Reviewer conducted review for release request ${release.id}. Status changed to UNDER_REVIEW.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json({
      id: updated.id,
      requestStatus: updated.status,
      status: updated.status,
      reviewedBy: updated.reviewedBy,
      remarks: updated.decisionRemarks,
    })
  } catch (err) {
    next(err)
  }
})

// POST /release-requests/:id/decision (Two-tier backward compatibility: Approver only)
releasesRouter.post('/:id/decision', requireRole('APPROVER', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const { decision, remarks } = req.body

    const targetDecision = (decision || '').toUpperCase()
    if (!['APPROVED', 'DECLINED'].includes(targetDecision)) {
      throw new ValidationError("Decision must be either 'APPROVED' or 'DECLINED'.")
    }

    const release = await prisma.releaseRequest.findUnique({
      where: { id },
      include: { fdr: true, stages: { orderBy: { order: 'asc' } } },
    })

    if (!release) throw new NotFoundError(`Release request ${id} not found.`)

    if (DEMO_RELEASE_RULES.REQUIRE_REVIEWER_PRIOR_TO_APPROVAL) {
      if (release.status !== 'UNDER_REVIEW') {
        throw new ConflictError(
          'Demo Rule Violation: Reviewer review must be completed (status UNDER_REVIEW) prior to final approver decision.'
        )
      }
    }

    const effectiveReviewerId = release.reviewedBy || 'user-reviewer-1'

    assertSeparationOfDuties({
      action: 'APPROVE_RELEASE',
      actorId: req.user!.id,
      reviewerId: effectiveReviewerId,
    })

    if (targetDecision === 'APPROVED') {
      // Check active hold
      const activeHold = await prisma.hold.findFirst({
        where: { institutionId: release.fdr.institutionId, active: true },
      })
      if (activeHold) {
        throw new ConflictError(
          `Final release approval blocked: Institution has an active regulatory hold (${activeHold.reason} - Ref: ${activeHold.referenceNo}).`
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        // Approve all remaining pending/active stages
        await tx.releaseStage.updateMany({
          where: { releaseRequestId: id, status: { in: ['PENDING', 'ACTIVE'] } },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
            remarks: remarks || 'Sanctioned by Competent Authority',
            actionById: req.user!.id,
          },
        })

        const updatedReq = await tx.releaseRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            decision: 'APPROVED',
            decisionRemarks: remarks || 'Statutory release approved by Bureau Head.',
            completedAt: new Date(),
          },
        })

        await tx.fDR.update({
          where: { id: release.fdrId },
          data: { lifecycleStatus: 'RELEASED' },
        })

        return updatedReq
      })

      await recordWorkflowTransition({
        entityType: 'RELEASE',
        entityId: release.id,
        previousStatus: release.status,
        newStatus: 'APPROVED',
        actor: req.user,
        remarks,
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'APPROVE_RELEASE_REQUEST',
          entityType: 'Release',
          entityId: release.id,
          changeSummary: `Approved statutory release for ${release.fdr.referenceNumber}. Lifecycle set to RELEASED.`,
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      try {
        await prisma.notification.create({
          data: {
            userId: release.requestedBy,
            fdrId: release.fdrId,
            type: 'RELEASE_STATUS',
            title: 'Statutory Deposit Release Approved',
            message: `Deposit release request for ${release.fdr.referenceNumber} has been officially approved. Lifecycle status set to RELEASED.`,
            urgency: 'NORMAL',
          },
        })
      } catch {
        // dedup
      }

      const issuedOrder = await generateAndSaveIssuedOrder({
        releaseRequestId: release.id,
        issuedById: req.user!.id,
        issuedByName: req.user!.name,
        issuedByRole: req.user!.role,
      })

      res.json({
        id: result.id,
        requestStatus: 'APPROVED',
        status: 'APPROVED',
        orderReference: issuedOrder.referenceNo,
        orderType: issuedOrder.type,
        remarks,
      })
    } else {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.releaseStage.updateMany({
          where: { releaseRequestId: id, status: { in: ['PENDING', 'ACTIVE'] } },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
            remarks: remarks || 'Statutory release declined.',
            actionById: req.user!.id,
          },
        })

        return tx.releaseRequest.update({
          where: { id },
          data: {
            status: 'DECLINED',
            decision: 'DECLINED',
            decisionRemarks: remarks || 'Statutory release declined.',
          },
        })
      })

      await recordWorkflowTransition({
        entityType: 'RELEASE',
        entityId: release.id,
        previousStatus: release.status,
        newStatus: 'DECLINED',
        actor: req.user,
        remarks,
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'DECLINE_RELEASE_REQUEST',
          entityType: 'Release',
          entityId: release.id,
          changeSummary: `Declined statutory release for ${release.fdr.referenceNumber}. Remarks: ${remarks}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.json({
        id: updated.id,
        requestStatus: 'DECLINED',
        status: 'DECLINED',
        remarks,
      })
    }
  } catch (err) {
    next(err)
  }
})
