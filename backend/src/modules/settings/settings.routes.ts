import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ValidationError } from '../../lib/errors'
import { param } from '../../lib/params'
import { requireRole } from '../../middleware/auth'
import { invalidateSettingCache } from '../../lib/settings'

export const settingsRouter = Router()

// Allowed keys and their validation schemas
const SETTING_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'verification.adapter_mode': z.enum(['MANUAL', 'MOCK_DEMO', 'LIVE']),
  'reminders.thresholds_days': z.array(z.number().int().min(0)),
  'escalation.days': z.number().int().min(1),
  'verification.pending_alert_days': z.number().int().min(1),
  'deposit.categories': z.record(z.any()),
  'documents.required_by_type': z.record(z.array(z.string())),
  'release.stage_order': z.array(z.string()),
  'release.stage_sla_days': z.record(z.number().int().min(1)),
  'instruments.required_fields': z.record(z.array(z.string())),
}

// GET /settings (Staff: Reviewer, Approver, Admin)
settingsRouter.get(
  '/',
  requireRole('REVIEWER', 'APPROVER', 'ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await prisma.setting.findMany({
        orderBy: { key: 'asc' },
      })

      const formatted = list.map((s) => {
        let parsedVal = s.value
        try {
          parsedVal = JSON.parse(s.value)
        } catch {
          parsedVal = s.value
        }
        return {
          key: s.key,
          value: parsedVal,
          description: s.description,
          isSample: s.isSample,
          updatedById: s.updatedById || undefined,
          updatedAt: s.updatedAt.toISOString(),
        }
      })

      res.json(formatted)
    } catch (err) {
      next(err)
    }
  }
)

const putSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
})

// PUT /settings/:key (Admin only)
settingsRouter.put(
  '/:key',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = param(req, 'key')
      const body = putSettingSchema.parse(req.body)

      // Validate value against key-specific schema if defined
      const validator = SETTING_SCHEMAS[key]
      let validatedValue = body.value
      if (validator) {
        try {
          validatedValue = validator.parse(body.value)
        } catch (err: any) {
          throw new ValidationError(
            `Invalid setting value for '${key}': ${err.errors?.map((e: any) => e.message).join(', ') || err.message}`
          )
        }
      }

      const existing = await prisma.setting.findUnique({
        where: { key },
      })

      const stringifiedValue = JSON.stringify(validatedValue)

      const updated = await prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value: stringifiedValue,
          description: body.description || existing?.description || `Configuration for ${key}`,
          isSample: false,
          updatedById: req.user!.id,
        },
        update: {
          value: stringifiedValue,
          description: body.description || existing?.description,
          isSample: false,
          updatedById: req.user!.id,
        },
      })

      // Invalidate in-memory cache
      invalidateSettingCache(key)

      let oldVal: any = null
      if (existing) {
        try {
          oldVal = JSON.parse(existing.value)
        } catch {
          oldVal = existing.value
        }
      }

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'UPDATE_SYSTEM_SETTING',
          entityType: 'Setting',
          entityId: key,
          changeSummary: `Admin modified statutory setting '${key}'.`,
          metadata: JSON.stringify({
            key,
            oldValue: oldVal,
            newValue: validatedValue,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.json({
        key: updated.key,
        value: validatedValue,
        description: updated.description,
        isSample: updated.isSample,
        updatedById: updated.updatedById,
        updatedAt: updated.updatedAt.toISOString(),
      })
    } catch (err) {
      next(err)
    }
  }
)
