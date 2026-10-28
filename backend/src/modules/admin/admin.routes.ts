import { Router, Request, Response, NextFunction } from 'express'
import { requireRole } from '../../middleware/auth'
import { runMaturityAndNotificationCheck } from '../../lib/maturityJob'
import { prisma } from '../../lib/prisma'

export const adminRouter = Router()

// POST /admin/run-maturity-check
adminRouter.post('/run-maturity-check', requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await runMaturityAndNotificationCheck()

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'RUN_MATURITY_CHECK',
        entityType: 'System',
        entityId: 'maturity-job',
        changeSummary: `Admin manually executed statutory maturity & notification check. Checked ${stats.instrumentsChecked} instruments, generated ${stats.remindersGenerated} reminders.`,
        metadata: JSON.stringify(stats),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json({
      success: true,
      message: 'Maturity check and notification batch executed successfully.',
      stats,
    })
  } catch (err) {
    next(err)
  }
})
