import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/auth'
import { healthRouter } from './modules/health/health.routes'
import { authRouter } from './modules/auth/auth.routes'
import { institutionsRouter } from './modules/institutions/institutions.routes'
import { fdrsRouter } from './modules/fdrs/fdrs.routes'
import { documentsRouter } from './modules/documents/documents.routes'
import { renewalsRouter } from './modules/renewals/renewals.routes'
import { releasesRouter } from './modules/releases/releases.routes'
import { notificationsRouter } from './modules/notifications/notifications.routes'
import { holdsRouter } from './modules/holds/holds.routes'
import { settingsRouter } from './modules/settings/settings.routes'
import { dashboardRouter } from './modules/dashboard/dashboard.routes'
import { reportsRouter } from './modules/reports/reports.routes'
import { auditRouter } from './modules/audit/audit.routes'
import { adminRouter } from './modules/admin/admin.routes'
import { importRouter } from './modules/import/import.routes'
import { swaggerRouter } from './docs/swagger'
import { NotFoundError } from './lib/errors'

export const app: Express = express()

// Security Headers
app.use(helmet({ contentSecurityPolicy: false }))

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true)
    },
    credentials: true,
  })
)

// Body & Cookie Parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Safe Request Logger
app.use(requestLogger)

// 1. Unauthenticated Public Health & Auth Routes
app.use('/health', healthRouter)
app.use(`${config.API_PREFIX}/health`, healthRouter)

// Auth Router: /auth/login is public with rate limiter; /auth/refresh and /auth/logout are mounted here
app.use('/auth', authRouter)
app.use(`${config.API_PREFIX}/auth`, authRouter)

// 2. OpenAPI 3 Spec & Interactive Swagger UI
app.use('/api-docs', swaggerRouter)
app.use(`${config.API_PREFIX}/api-docs`, swaggerRouter)

// 3. Protected Routers - Authenticate required on EVERY route except public endpoints
const protectedRouters: [string, express.Router][] = [
  ['/institutions', institutionsRouter],
  ['/fdrs', fdrsRouter],
  ['/documents', documentsRouter],
  ['/renewals', renewalsRouter],
  ['/release-requests', releasesRouter],
  ['/releases', releasesRouter], // Compatibility alias
  ['/holds', holdsRouter],
  ['/settings', settingsRouter],
  ['/notifications', notificationsRouter],
  ['/dashboard', dashboardRouter],
  ['/reports', reportsRouter],
  ['/audit-logs', auditRouter],
  ['/audit', auditRouter], // Compatibility alias
  ['/admin', adminRouter],
  ['/import', importRouter],
]

for (const [routePath, router] of protectedRouters) {
  app.use(`${config.API_PREFIX}${routePath}`, authenticate, router)
  app.use(routePath, authenticate, router)
}

// 4. Unmatched Route Handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found on this service.`))
})

// 5. Centralized Error Handler
app.use(errorHandler)
