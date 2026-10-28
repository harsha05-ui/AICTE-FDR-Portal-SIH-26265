import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { requireRole } from '../../middleware/auth'

export const auditRouter = Router()

// GET /audit-logs (Admin & Reviewer only)
auditRouter.get('/', requireRole('ADMIN', 'REVIEWER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { actor: true },
    })

    const formatted = list.map((a) => {
      let parsedMetadata: any = undefined
      try {
        if (a.metadata) {
          const parsed = JSON.parse(a.metadata)
          // Ensure no passwords or tokens are exposed
          if (parsed && typeof parsed === 'object') {
            delete parsed.password
            delete parsed.passwordHash
            delete parsed.token
          }
          parsedMetadata = parsed
        }
      } catch {
        parsedMetadata = a.metadata
      }

      return {
        id: a.id,
        actorId: a.actorId,
        actorName: a.actor?.name || a.actorName || 'System',
        actorRole: a.actor?.role || a.actorRole || 'ADMIN',
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        timestamp: a.timestamp.toISOString(),
        changeSummary: a.changeSummary,
        ipAddress: a.ipAddress || '127.0.0.1',
        metadata: parsedMetadata,
      }
    })

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})
