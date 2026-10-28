import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { UnauthorizedError, ConflictError } from '../../lib/errors'
import {
  loginRateLimiter,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  authenticate,
} from '../../middleware/auth'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const normalized = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      include: { institution: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid official email or password credentials.')
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedError('Invalid official email or password credentials.')
    }

    const token = signAccessToken(user)
    const refreshToken = signRefreshToken(user)

    // Set rotating refresh token in httpOnly secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/',
    })

    // Audit log for login
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: user.id,
        changeSummary: `User ${user.email} authenticated successfully.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json({
      token,
      refreshToken,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation || user.role,
      department: user.department || 'Statutory Compliance',
      institutionId: user.institutionId || undefined,
      institutionName: user.institution?.name || undefined,
    })
  } catch (err) {
    next(err)
  }
})

// POST /auth/refresh (Rotates refresh token in httpOnly cookie and returns new access token)
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken

    if (!token) {
      throw new UnauthorizedError('Refresh token required in cookie or body.')
    }

    let payload: { sub: string }
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token.')
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { institution: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account inactive or not found.')
    }

    const newAccessToken = signAccessToken(user)
    const newRefreshToken = signRefreshToken(user)

    // Rotate refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/',
    })

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'AUTH_TOKEN_REFRESH',
        entityType: 'User',
        entityId: user.id,
        changeSummary: `Rotated access and refresh tokens for user ${user.email}.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId || undefined,
      },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Revoke and clear cookie
    res.clearCookie('refreshToken', { path: '/' })

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          action: 'AUTH_LOGOUT',
          entityType: 'User',
          entityId: req.user.id,
          changeSummary: `User ${req.user.email} logged out.`,
          ipAddress: req.ip || '127.0.0.1',
        },
      })
    }
    res.json({ message: 'Session closed successfully' })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({
    id: req.user!.id,
    name: req.user!.name,
    email: req.user!.email,
    role: req.user!.role,
    designation: req.user!.designation || req.user!.role,
    department: req.user!.department || 'Statutory Compliance',
    institutionId: req.user!.institutionId || undefined,
    institutionName: req.user!.institutionName || undefined,
  })
})

const registerInstitutionSchema = z.object({
  institutionCode: z.string().min(3, 'AICTE Permanent ID is required'),
  institutionName: z.string().min(3, 'Institution name is required'),
  principalName: z.string().min(2, 'Authorized signatory name is required'),
  email: z.string().email('Valid official email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  state: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  contactPhone: z.string().optional(),
})

authRouter.post('/register-institution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerInstitutionSchema.parse(req.body)
    const normalizedEmail = data.email.toLowerCase().trim()
    const normalizedCode = data.institutionCode.trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existingUser) {
      throw new ConflictError('An account with this official email is already registered.')
    }

    let institution = await prisma.institution.findUnique({
      where: { institutionCode: normalizedCode },
    })

    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          institutionCode: normalizedCode,
          name: data.institutionName.trim(),
          principalName: data.principalName.trim(),
          state: data.state || 'Delhi',
          city: data.city || 'New Delhi',
          type: data.type || 'Government',
          contactEmail: normalizedEmail,
          contactPhone: data.contactPhone || '+91 11 2690 7400',
          status: 'ACTIVE',
        },
      })
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.principalName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'INSTITUTION_USER',
        designation: 'Principal & Authorized Signatory',
        department: 'Institutional Administration',
        institutionId: institution.id,
        isActive: true,
      },
      include: { institution: true },
    })

    const token = signAccessToken(user)
    const refreshToken = signRefreshToken(user)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
      path: '/',
    })

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'INSTITUTION_REGISTERED',
        entityType: 'Institution',
        entityId: institution.id,
        changeSummary: `Institution ${institution.name} (${institution.institutionCode}) registered by ${user.email}.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.status(201).json({
      token,
      refreshToken,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      department: user.department,
      institutionId: institution.id,
      institutionName: institution.name,
    })
  } catch (err) {
    next(err)
  }
})

