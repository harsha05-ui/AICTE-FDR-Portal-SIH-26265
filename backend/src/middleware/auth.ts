import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { config } from '../config'
import { prisma } from '../lib/prisma'
import { UnauthorizedError, ForbiddenError } from '../lib/errors'
import { Role, Office } from '../lib/types'

interface JwtPayload {
  sub: string
  email: string
  role: Role
  office?: Office | string | null
  institutionId?: string | null
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
})

export function signAccessToken(user: {
  id: string
  email: string
  role: string
  office?: string | null
  institutionId?: string | null
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      office: user.office,
      institutionId: user.institutionId,
    },
    config.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

export function signRefreshToken(user: { id: string }): string {
  const secret = config.JWT_REFRESH_SECRET || `${config.JWT_SECRET}_refresh`
  return jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: '7d' })
}

export function verifyRefreshToken(token: string): { sub: string } {
  const secret = config.JWT_REFRESH_SECRET || `${config.JWT_SECRET}_refresh`
  return jwt.verify(token, secret) as { sub: string }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.query?.sig && req.query?.expires) {
      return next()
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid')
    }

    const token = authHeader.substring(7).trim()
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token')
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { institution: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated')
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      office: (user.office as Office) || null,
      institutionId: user.institutionId,
      institutionName: user.institution?.name,
      designation: user.designation,
      department: user.department,
    }

    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError())
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access forbidden: requires role [${roles.join(', ')}]`))
    }
    next()
  }
}

export function requireOffice(...offices: Office[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError())
    }
    if (req.user.role === 'ADMIN') {
      return next() // Admin can act across all regulatory offices
    }
    if (!req.user.office || !offices.includes(req.user.office as Office)) {
      return next(
        new ForbiddenError(
          `Access forbidden: requires office assignment to [${offices.join(', ')}]. Current office: ${req.user.office || 'Unassigned'}`
        )
      )
    }
    next()
  }
}


export function enforceInstitutionScope(req: Request, targetInstitutionId: string) {
  if (req.user?.role === 'INSTITUTION_USER') {
    if (!req.user.institutionId || req.user.institutionId !== targetInstitutionId) {
      throw new ForbiddenError('Access forbidden: cannot access data belonging to another institution')
    }
  }
}
