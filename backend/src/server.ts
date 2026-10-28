import { app } from './app'
import { config } from './config'
import { prisma } from './lib/prisma'
import { startMaturityCronJob } from './lib/maturityJob'

const server = app.listen(config.PORT, async () => {
  console.log(`[AICTE-FDR-BACKEND] Server listening on port ${config.PORT} (env: ${config.NODE_ENV})`)
  console.log(`[AICTE-FDR-BACKEND] Health endpoint: http://localhost:${config.PORT}${config.API_PREFIX}/health`)

  try {
    await prisma.$connect()
    console.log('[AICTE-FDR-BACKEND] Database connection verified successfully.')
  } catch (err) {
    console.error('[AICTE-FDR-BACKEND] Database connection error:', err)
  }

  // Start background maturity and SLA escalation cron schedule
  startMaturityCronJob()
})

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down AICTE FDR backend service...`)
  server.close(async () => {
    await prisma.$disconnect()
    console.log('[AICTE-FDR-BACKEND] Database disconnected. Process exiting cleanly.')
    process.exit(0)
  })
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))
