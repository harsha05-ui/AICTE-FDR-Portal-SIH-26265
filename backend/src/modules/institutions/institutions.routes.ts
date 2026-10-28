import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ValidationError } from '../../lib/errors'
import { param } from '../../lib/params'
import { requireRole } from '../../middleware/auth'

export const institutionsRouter = Router()

const createInstitutionSchema = z.object({
  institutionCode: z.string().min(3),
  name: z.string().min(3),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  region: z.string().optional(),
  type: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  principalName: z.string().optional(),
})

// List all institutions
institutionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {}
    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId) {
      where.id = req.user.institutionId
    }

    const list = await prisma.institution.findMany({
      where,
      include: {
        fdrs: {
          select: {
            depositAmount: true,
            lifecycleStatus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const formatted = list.map((inst) => {
      const totalDeposits = inst.fdrs
        .reduce((acc, f) => acc + Number(f.depositAmount), 0)
        .toString()
      const activeInstruments = inst.fdrs.filter((f) => f.lifecycleStatus === 'ACTIVE').length

      return {
        id: inst.id,
        aictePermanentId: inst.institutionCode,
        name: inst.name,
        address: inst.address || 'Campus Address',
        city: inst.city || 'New Delhi',
        state: inst.state || 'Delhi',
        region: inst.region || 'Northern',
        type: inst.type || 'Government',
        contactEmail: inst.contactEmail || 'contact@aicte.gov.in',
        contactPhone: inst.contactPhone || '+91 11 2690 7400',
        principalName: inst.principalName || 'Dr. Authorized Signatory',
        status: inst.status === 'ACTIVE' ? 'Active' : inst.status,
        totalDeposits,
        activeInstruments,
      }
    })

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})

// Get single institution
institutionsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== id) {
      throw new NotFoundError(`Institution with ID ${id} was not found.`)
    }

    const inst = await prisma.institution.findUnique({
      where: { id },
      include: {
        fdrs: true,
      },
    })

    if (!inst) {
      throw new NotFoundError(`Institution with ID ${id} was not found.`)
    }

    const totalDeposits = inst.fdrs
      .reduce((acc, f) => acc + Number(f.depositAmount), 0)
      .toString()
    const activeInstruments = inst.fdrs.filter((f) => f.lifecycleStatus === 'ACTIVE').length

    res.json({
      id: inst.id,
      aictePermanentId: inst.institutionCode,
      name: inst.name,
      address: inst.address || 'Campus Address',
      city: inst.city || 'New Delhi',
      state: inst.state || 'Delhi',
      region: inst.region || 'Northern',
      type: inst.type || 'Government',
      contactEmail: inst.contactEmail || 'contact@aicte.gov.in',
      contactPhone: inst.contactPhone || '+91 11 2690 7400',
      principalName: inst.principalName || 'Dr. Authorized Signatory',
      status: inst.status === 'ACTIVE' ? 'Active' : inst.status,
      totalDeposits,
      activeInstruments,
    })
  } catch (err) {
    next(err)
  }
})

// Create institution (ADMIN only)
institutionsRouter.post('/', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createInstitutionSchema.parse(req.body)
    const existing = await prisma.institution.findUnique({
      where: { institutionCode: data.institutionCode },
    })
    if (existing) {
      throw new ValidationError(`Institution code ${data.institutionCode} already exists.`)
    }

    const created = await prisma.institution.create({
      data: {
        institutionCode: data.institutionCode,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        region: data.region,
        type: data.type,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        principalName: data.principalName,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'CREATE_INSTITUTION',
        entityType: 'Institution',
        entityId: created.id,
        changeSummary: `Created institution ${created.name} (${created.institutionCode}).`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

const createHoldSchema = z.object({
  reason: z.string().trim().min(5, 'Reason is mandatory and must be descriptive'),
  sourceBody: z.string().trim().min(2, 'Source body is required (e.g. CBI, AICTE Vigilance, High Court)'),
  referenceNo: z.string().trim().optional(),
  referenceNumber: z.string().trim().optional(),
})

// POST /institutions/:id/holds (Approver, Admin)
institutionsRouter.post(
  '/:id/holds',
  requireRole('APPROVER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institutionId = param(req, 'id')
      const validated = createHoldSchema.parse(req.body)
      const ref = (validated.referenceNo || validated.referenceNumber || `HOLD/REG/${Date.now()}`).trim()

      const institution = await prisma.institution.findUnique({
        where: { id: institutionId },
      })

      if (!institution) {
        throw new NotFoundError(`Institution ${institutionId} not found.`)
      }

      const hold = await prisma.hold.create({
        data: {
          institutionId: institution.id,
          reason: validated.reason,
          sourceBody: validated.sourceBody,
          referenceNo: ref,
          active: true,
          placedBy: req.user!.id,
        },
      })

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'PLACE_REGULATORY_HOLD',
          entityType: 'Hold',
          entityId: hold.id,
          changeSummary: `Placed regulatory hold on ${institution.name} (${institution.institutionCode}). Reason: ${hold.reason}. Source: ${hold.sourceBody}. Ref: ${hold.referenceNo}.`,
          metadata: JSON.stringify(hold),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.status(201).json(hold)
    } catch (err) {
      next(err)
    }
  }
)

