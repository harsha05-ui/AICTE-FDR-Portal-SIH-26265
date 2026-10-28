import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ConflictError } from '../../lib/errors'
import { param } from '../../lib/params'
import { requireRole } from '../../middleware/auth'

export const holdsRouter = Router()

// GET /holds (Staff or scoped to institution user)
holdsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active, status, institutionId } = req.query as Record<string, string>
    const where: any = {}

    if (req.user?.role === 'INSTITUTION_USER') {
      where.institutionId = req.user.institutionId
    } else if (institutionId) {
      where.institutionId = institutionId
    }

    if (active !== undefined && active !== '') {
      where.active = active === 'true' || active === '1'
    } else if (status !== undefined && status !== '' && status !== 'all') {
      where.active = status === 'ACTIVE'
    }

    const list = await prisma.hold.findMany({
      where,
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            institutionCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = list.map((h) => ({
      id: h.id,
      institutionId: h.institutionId,
      institutionName: h.institution?.name,
      institutionCode: h.institution?.institutionCode,
      reason: h.reason,
      sourceBody: h.sourceBody,
      referenceNo: h.referenceNo,
      referenceNumber: h.referenceNo,
      active: h.active,
      status: h.active ? ('ACTIVE' as const) : ('CLEARED' as const),
      placedBy: h.placedBy,
      placedAt: h.placedAt.toISOString(),
      clearedBy: h.clearedBy || undefined,
      clearedAt: h.clearedAt ? h.clearedAt.toISOString() : undefined,
      clearRemarks: h.clearRemarks || undefined,
      createdAt: h.createdAt.toISOString(),
    }))

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})

const clearHoldSchema = z
  .object({
    remarks: z.string().trim().min(3).optional(),
    clearRemarks: z.string().trim().min(3).optional(),
  })
  .refine((data) => Boolean(data.remarks || data.clearRemarks), {
    message: 'Mandatory clear remarks are required',
    path: ['clearRemarks'],
  })

// POST /holds/:id/clear (Approver, Admin)
holdsRouter.post(
  '/:id/clear',
  requireRole('APPROVER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = param(req, 'id')
      const validated = clearHoldSchema.parse(req.body)
      const clearRemarks = (validated.clearRemarks || validated.remarks)!.trim()

      const hold = await prisma.hold.findUnique({
        where: { id },
        include: { institution: true },
      })

      if (!hold) {
        throw new NotFoundError(`Hold ${id} not found.`)
      }

      if (!hold.active) {
        throw new ConflictError(`Hold ${id} is already cleared.`)
      }

      const updated = await prisma.hold.update({
        where: { id },
        data: {
          active: false,
          clearedBy: req.user!.id,
          clearedAt: new Date(),
          clearRemarks,
        },
        include: { institution: true },
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'CLEAR_REGULATORY_HOLD',
          entityType: 'Hold',
          entityId: hold.id,
          changeSummary: `Cleared regulatory hold on ${hold.institution?.name}. Remarks: ${clearRemarks}`,
          metadata: JSON.stringify({ old: hold, new: updated }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.json({
        id: updated.id,
        institutionId: updated.institutionId,
        institutionName: updated.institution?.name,
        reason: updated.reason,
        sourceBody: updated.sourceBody,
        referenceNo: updated.referenceNo,
        active: updated.active,
        placedBy: updated.placedBy,
        placedAt: updated.placedAt.toISOString(),
        clearedBy: updated.clearedBy,
        clearedAt: updated.clearedAt?.toISOString(),
        clearRemarks: updated.clearRemarks,
      })
    } catch (err) {
      next(err)
    }
  }
)
