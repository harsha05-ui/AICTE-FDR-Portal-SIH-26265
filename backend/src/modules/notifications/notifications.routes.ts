import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { param } from '../../lib/params'
import { NotFoundError } from '../../lib/errors'

export const notificationsRouter = Router()

// GET /notifications
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = list.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type.toLowerCase(),
      thresholdDays: n.thresholdDays || undefined,
      urgency: n.urgency.toLowerCase(),
      timestamp: n.createdAt.toISOString(),
      isRead: Boolean(n.readAt),
      link: n.fdrId ? `/fdrs/${n.fdrId}` : undefined,
    }))

    res.json(formatted)
  } catch (err) {
    next(err)
  }
})

// POST /notifications/:id/read
notificationsRouter.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const notif = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    })

    if (!notif) {
      throw new NotFoundError(`Notification ${id} not found.`)
    }

    await prisma.notification.update({
      where: { id: notif.id },
      data: { readAt: new Date() },
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// POST /notifications/mark-all-read
notificationsRouter.post('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
