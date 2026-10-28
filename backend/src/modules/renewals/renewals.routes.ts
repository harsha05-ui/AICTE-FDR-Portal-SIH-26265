import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../lib/errors'
import { param, serializeAmount } from '../../lib/params'
import { requireRole } from '../../middleware/auth'
import { assertSeparationOfDuties, recordWorkflowTransition } from '../../lib/workflow'
import { RenewalType } from '../../lib/types'

export const renewalsRouter = Router()

// GET /renewals
renewalsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {}
    if (req.user?.role === 'INSTITUTION_USER') {
      where.previousFdr = { institutionId: req.user.institutionId }
    }

    const list = await prisma.renewalRecord.findMany({
      where,
      include: {
        previousFdr: { include: { institution: true } },
        replacementFdr: true,
        submitter: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = list.map((r) => ({
      id: r.id,
      fdrId: r.previousFdrId,
      fdrNumber: r.previousFdr.referenceNumber,
      institutionId: r.previousFdr.institutionId,
      institutionName: r.previousFdr.institution?.name || '',
      requestType: r.type,
      type: r.type,
      requestStatus: r.status,
      status: r.status,
      submissionDate: r.createdAt.toISOString(),
      proposedMaturityDate: r.proposedMaturity
        ? r.proposedMaturity.toISOString().slice(0, 10)
        : '2031-11-20',
      proposedAmount: r.proposedAmount
        ? serializeAmount(r.proposedAmount)
        : serializeAmount(r.previousFdr.depositAmount),
      amount: r.proposedAmount || r.previousFdr.depositAmount,
      newBankName: r.newBankName || undefined,
      newBranchName: r.newBranchName || undefined,
      replacementFdrId: r.replacementFdrId || undefined,
      replacementFdrNumber: r.replacementFdr?.referenceNumber || undefined,
      justification: r.justification || 'Statutory security deposit extension.',
      remarks: r.remarks || undefined,
      reviewedBy: r.reviewedBy || undefined,
      decisionAt: r.decisionAt ? r.decisionAt.toISOString() : undefined,
    }))

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})

// Handler for creating renewal request
export async function createRenewalHandler(
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
      throw new ForbiddenError('Access forbidden: cannot request renewal for another institution')
    }

    const requestType: RenewalType =
      (data.type || data.requestType || 'RENEWAL').toUpperCase() === 'REPLACEMENT'
        ? 'REPLACEMENT'
        : 'RENEWAL'

    const proposedAmount = data.proposedAmount
      ? Number(data.proposedAmount)
      : fdr.depositAmount

    const proposedMaturity = data.proposedMaturityDate || data.proposedMaturity
      ? new Date(data.proposedMaturityDate || data.proposedMaturity)
      : new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000)

    const created = await prisma.renewalRecord.create({
      data: {
        previousFdrId: fdr.id,
        submittedBy: req.user!.id,
        type: requestType,
        status: 'SUBMITTED',
        proposedAmount,
        proposedMaturity,
        newBankName: data.newBankName,
        newBranchName: data.newBranchName,
        justification: data.justification || 'Statutory deposit extension.',
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'CREATE_RENEWAL_REQUEST',
        entityType: 'Renewal',
        entityId: created.id,
        changeSummary: `Requested ${requestType} for ${fdr.referenceNumber}.`,
        metadata: JSON.stringify(created),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.status(201).json({
      id: created.id,
      fdrId: fdr.id,
      fdrNumber: fdr.referenceNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institution?.name,
      requestType: created.type,
      type: created.type,
      requestStatus: created.status,
      status: created.status,
      proposedAmount: serializeAmount(created.proposedAmount),
      submissionDate: created.createdAt.toISOString(),
    })
  } catch (err) {
    next(err)
  }
}

// POST /renewals (compatibility route)
renewalsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  createRenewalHandler(req.body.fdrId, req.body, req, res, next)
})

// POST /renewals/:id/decision (Approver only)
renewalsRouter.post('/:id/decision', requireRole('APPROVER', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const { decision, remarks } = req.body

    const targetDecision = (decision || '').toUpperCase()
    if (!['APPROVED', 'DECLINED'].includes(targetDecision)) {
      throw new ValidationError("Decision must be either 'APPROVED' or 'DECLINED'.")
    }

    const renewal = await prisma.renewalRecord.findUnique({
      where: { id },
      include: { previousFdr: { include: { institution: true } } },
    })

    if (!renewal) {
      throw new NotFoundError(`Renewal request ${id} not found.`)
    }

    if (renewal.status !== 'SUBMITTED' && renewal.status !== 'UNDER_REVIEW') {
      throw new ConflictError(`Renewal request is already finalized with status '${renewal.status}'.`)
    }

    // Separation of duties check
    assertSeparationOfDuties({
      action: 'APPROVE_RENEWAL',
      actorId: req.user!.id,
      reviewerId: renewal.reviewedBy || undefined,
    })

    if (targetDecision === 'APPROVED') {
      const result = await prisma.$transaction(async (tx) => {
        const oldFdr = renewal.previousFdr
        const bank = renewal.newBankName || oldFdr.bankName
        const refNum = `RNW/${bank.slice(0, 3).toUpperCase()}/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`

        // 1. Create linked new FDR instrument
        const newFdr = await tx.fDR.create({
          data: {
            referenceNumber: refNum,
            institutionId: oldFdr.institutionId,
            bankName: bank,
            branchName: renewal.newBranchName || oldFdr.branchName,
            ifscCode: oldFdr.ifscCode,
            accountNumber: oldFdr.accountNumber,
            depositAmount: renewal.proposedAmount || oldFdr.depositAmount,
            interestRate: oldFdr.interestRate,
            instrumentType: oldFdr.instrumentType,
            issueDate: new Date(),
            maturityDate: renewal.proposedMaturity || new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000),
            verificationStatus: 'SUBMITTED', // Linked instrument is SUBMITTED
            lifecycleStatus: 'ACTIVE',
            riskLevel: 'LOW',
            flags: '[]',
            previousFdrId: oldFdr.id,
            createdBy: req.user!.id,
          },
        })

        // 2. Mark old FDR as RENEWED
        await tx.fDR.update({
          where: { id: oldFdr.id },
          data: {
            lifecycleStatus: 'RENEWED',
            replacementFdrId: newFdr.id,
          },
        })

        // 3. Update renewal record
        const updatedRenewal = await tx.renewalRecord.update({
          where: { id: renewal.id },
          data: {
            status: 'APPROVED',
            replacementFdrId: newFdr.id,
            remarks: remarks || 'Renewal approved by Competent Authority.',
            reviewedBy: req.user!.id,
            decisionAt: new Date(),
          },
        })

        return { newFdr, updatedRenewal }
      })

      await recordWorkflowTransition({
        entityType: 'RENEWAL',
        entityId: renewal.id,
        previousStatus: renewal.status,
        newStatus: 'APPROVED',
        actor: req.user,
        remarks,
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'APPROVE_RENEWAL',
          entityType: 'Renewal',
          entityId: renewal.id,
          changeSummary: `Approved renewal for ${renewal.previousFdr.referenceNumber}. Generated linked FDR ${result.newFdr.referenceNumber}.`,
          metadata: JSON.stringify({ newFdrId: result.newFdr.id }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      // Notify institution user
      try {
        await prisma.notification.create({
          data: {
            userId: renewal.submittedBy,
            fdrId: result.newFdr.id,
            type: 'RENEWAL_STATUS',
            title: 'FDR Renewal Approved',
            message: `Your renewal request for ${renewal.previousFdr.referenceNumber} was approved. New linked instrument ${result.newFdr.referenceNumber} has been established.`,
            urgency: 'NORMAL',
          },
        })
      } catch {
        // notification created
      }

      res.json({
        id: result.updatedRenewal.id,
        fdrId: renewal.previousFdrId,
        fdrNumber: renewal.previousFdr.referenceNumber,
        requestStatus: 'APPROVED',
        status: 'APPROVED',
        replacementFdrId: result.newFdr.id,
        replacementFdrNumber: result.newFdr.referenceNumber,
        remarks,
      })
    } else {
      // DECLINED
      const updated = await prisma.renewalRecord.update({
        where: { id },
        data: {
          status: 'DECLINED',
          remarks: remarks || 'Renewal declined.',
          reviewedBy: req.user!.id,
          decisionAt: new Date(),
        },
      })

      await recordWorkflowTransition({
        entityType: 'RENEWAL',
        entityId: renewal.id,
        previousStatus: renewal.status,
        newStatus: 'DECLINED',
        actor: req.user,
        remarks,
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'DECLINE_RENEWAL',
          entityType: 'Renewal',
          entityId: renewal.id,
          changeSummary: `Declined renewal for ${renewal.previousFdr.referenceNumber}. Remarks: ${remarks}`,
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.json({
        id: updated.id,
        fdrId: renewal.previousFdrId,
        fdrNumber: renewal.previousFdr.referenceNumber,
        requestStatus: 'DECLINED',
        status: 'DECLINED',
        remarks,
      })
    }
  } catch (err) {
    next(err)
  }
})
