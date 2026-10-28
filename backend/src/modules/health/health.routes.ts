import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export const healthRouter = Router()

healthRouter.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'healthy'
  let dbLatencyMs = 0

  const start = Date.now()
  try {
    // Ping database
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - start
  } catch (error) {
    dbStatus = 'unreachable'
  }

  const isHealthy = dbStatus === 'healthy'

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'aicte-fdr-portal-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    memoryUsageMB: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  })
})
