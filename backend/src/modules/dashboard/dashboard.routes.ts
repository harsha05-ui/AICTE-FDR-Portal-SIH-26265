import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { serializeAmount } from '../../lib/params'

export const dashboardRouter = Router()

// Helper to build scoped filter
function buildFdrWhere(req: Request) {
  const isInstUser = req.user?.role === 'INSTITUTION_USER'
  const where: any = {}

  if (isInstUser) {
    where.institutionId = req.user?.institutionId
  }

  const { region, category, instrumentType, startDate, endDate } = req.query

  if (region || category) {
    where.institution = {}
    if (region) {
      where.institution.region = { contains: String(region) }
    }
    if (category) {
      where.institution.type = { contains: String(category) }
    }
  }

  if (instrumentType) {
    where.instrumentType = String(instrumentType)
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(String(startDate))
    }
    if (endDate) {
      where.createdAt.lte = new Date(String(endDate))
    }
  }

  return where
}

// GET /dashboard/summary (Role-scoped and filterable)
dashboardRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdrWhere = buildFdrWhere(req)
    const isInstUser = req.user?.role === 'INSTITUTION_USER'
    const institutionId = isInstUser ? req.user?.institutionId : undefined

    const allFdrs = await prisma.fDR.findMany({
      where: fdrWhere,
      include: {
        institution: true,
        documents: true,
        verifications: { orderBy: { verifiedAt: 'asc' } },
      },
    })

    const now = new Date()
    const todayMs = now.getTime()
    const days30Ahead = new Date(todayMs + 30 * 24 * 3600 * 1000)
    const days60Ahead = new Date(todayMs + 60 * 24 * 3600 * 1000)
    const days90Ahead = new Date(todayMs + 90 * 24 * 3600 * 1000)

    // 1. Trust-level counts
    const trustLevelCounts = {
      SUBMITTED: allFdrs.filter((f) => f.trustLevel === 'SUBMITTED').length,
      STAFF_VERIFIED: allFdrs.filter((f) => f.trustLevel === 'STAFF_VERIFIED').length,
      BANK_CONFIRMED: allFdrs.filter((f) => f.trustLevel === 'BANK_CONFIRMED').length,
    }

    // 2. Expiry bands (active / expiring instruments)
    const nonClosedFdrs = allFdrs.filter(
      (f) => f.lifecycleStatus !== 'RELEASED' && f.lifecycleStatus !== 'RENEWED'
    )
    const expiryBands = {
      days30: nonClosedFdrs.filter((f) => {
        const mat = new Date(f.maturityDate)
        return mat >= now && mat <= days30Ahead
      }).length,
      days60: nonClosedFdrs.filter((f) => {
        const mat = new Date(f.maturityDate)
        return mat > days30Ahead && mat <= days60Ahead
      }).length,
      days90: nonClosedFdrs.filter((f) => {
        const mat = new Date(f.maturityDate)
        return mat > days60Ahead && mat <= days90Ahead
      }).length,
      pastMaturity: nonClosedFdrs.filter((f) => new Date(f.maturityDate) < now).length,
    }

    // 3. Average days per release stage & stuck cases beyond SLA per office
    const stageWhere: any = {}
    if (institutionId) {
      stageWhere.releaseRequest = { fdr: { institutionId } }
    }
    const allStages = await prisma.releaseStage.findMany({
      where: stageWhere,
      include: { releaseRequest: { include: { fdr: true } } },
    })

    const stageDurationMap: Record<string, { totalDays: number; count: number }> = {}
    const stuckBeyondSla: Record<string, number> = {}

    for (const stage of allStages) {
      // Completed stages -> compute duration
      if (stage.status === 'APPROVED' && stage.startedAt && stage.completedAt) {
        const days = Math.max(0, (new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime()) / (1000 * 3600 * 24))
        if (!stageDurationMap[stage.office]) {
          stageDurationMap[stage.office] = { totalDays: 0, count: 0 }
        }
        stageDurationMap[stage.office].totalDays += days
        stageDurationMap[stage.office].count++
      }

      // Active stages past SLA dueAt
      if (stage.status === 'ACTIVE' && stage.dueAt && new Date(stage.dueAt) < now) {
        stuckBeyondSla[stage.office] = (stuckBeyondSla[stage.office] || 0) + 1
      }
    }

    const averageDaysPerStage: Record<string, number> = {}
    for (const [off, val] of Object.entries(stageDurationMap)) {
      averageDaysPerStage[off] = val.count > 0 ? Number((val.totalDays / val.count).toFixed(1)) : 0
    }

    // 4. Missing document count
    const missingDocumentsCount = nonClosedFdrs.filter((f) => f.documents.length === 0).length

    // 5. Active holds count
    const holdWhere: any = { active: true }
    if (institutionId) {
      holdWhere.institutionId = institutionId
    }
    const activeHoldsCount = await prisma.hold.count({ where: holdWhere })

    // 6. Lien-not-confirmed count
    const lienNotConfirmedCount = nonClosedFdrs.filter(
      (f) => f.lienStatus !== 'CONFIRMED_BY_STAFF' && f.lienStatus !== 'CONFIRMED_BY_BANK'
    ).length

    // Standard lifecycle counts
    const countsByLifecycle = {
      ACTIVE: allFdrs.filter((f) => f.lifecycleStatus === 'ACTIVE').length,
      EXPIRING: allFdrs.filter((f) => f.lifecycleStatus === 'EXPIRING').length,
      MATURED: allFdrs.filter((f) => f.lifecycleStatus === 'MATURED').length,
      RENEWED: allFdrs.filter((f) => f.lifecycleStatus === 'RENEWED').length,
      RELEASED: allFdrs.filter((f) => f.lifecycleStatus === 'RELEASED').length,
    }

    const pendingVerifications = allFdrs.filter(
      (f) => f.verificationStatus === 'SUBMITTED' || f.verificationStatus === 'UNDER_REVIEW'
    ).length

    // Total value
    const totalDepositValue = allFdrs.reduce((acc, f) => acc + Number(f.depositAmount), 0)

    // Priority queue
    const priorityQueue = allFdrs
      .filter(
        (f) =>
          f.verificationStatus === 'SUBMITTED' ||
          f.verificationStatus === 'DISCREPANCY' ||
          f.lifecycleStatus === 'EXPIRING' ||
          f.lifecycleStatus === 'MATURED' ||
          f.riskLevel === 'HIGH'
      )
      .sort((a, b) => {
        if (a.riskLevel === 'HIGH' && b.riskLevel !== 'HIGH') return -1
        if (b.riskLevel === 'HIGH' && a.riskLevel !== 'HIGH') return 1
        return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
      })
      .slice(0, 10)
      .map((f) => ({
        id: f.id,
        fdrNumber: f.referenceNumber,
        institutionName: f.institution?.name || '',
        bankName: f.bankName,
        amount: serializeAmount(f.depositAmount),
        maturityDate: new Date(f.maturityDate).toISOString().slice(0, 10),
        verificationStatus: f.verificationStatus,
        lifecycleStatus: f.lifecycleStatus,
        riskLevel: f.riskLevel,
        trustLevel: f.trustLevel,
        lienStatus: f.lienStatus,
      }))

    const notifWhere: any = { type: 'MATURITY_ALERT' }
    if (isInstUser) {
      notifWhere.userId = req.user!.id
    }
    const remindersGeneratedCount = await prisma.notification.count({ where: notifWhere })

    const metrics = {
      avgVerificationHours: 24.0,
      discrepanciesFlaggedCount: allFdrs.filter(
        (f) => f.verificationStatus === 'DISCREPANCY' || f.riskLevel === 'HIGH' || f.riskLevel === 'MEDIUM'
      ).length,
      remindersGeneratedCount,
      casesPendingBeyondSla: allFdrs.filter(
        (f) => f.verificationStatus === 'SUBMITTED' || f.verificationStatus === 'UNDER_REVIEW'
      ).length,
      totalDocumentsMissing: missingDocumentsCount,
    }

    res.json({
      countsByLifecycle,
      trustLevelCounts,
      expiryBands,
      averageDaysPerStage,
      stuckBeyondSla,
      missingDocumentsCount,
      activeHoldsCount,
      lienNotConfirmedCount,
      pendingVerifications,
      totalDepositValue,
      metrics,
      priorityQueue,
    })
  } catch (err) {
    next(err)
  }
})

// === Drill-Down Endpoints ===

// 1. GET /dashboard/drilldown/trust-level?level=SUBMITTED|STAFF_VERIFIED|BANK_CONFIRMED
dashboardRouter.get('/drilldown/trust-level', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdrWhere = buildFdrWhere(req)
    if (req.query.level) {
      fdrWhere.trustLevel = String(req.query.level)
    }

    const list = await prisma.fDR.findMany({
      where: fdrWhere,
      include: { institution: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      total: list.length,
      level: req.query.level || 'ALL',
      instruments: list.map((f) => ({
        id: f.id,
        referenceNumber: f.referenceNumber,
        bankName: f.bankName,
        depositAmount: serializeAmount(f.depositAmount),
        instrumentType: f.instrumentType,
        trustLevel: f.trustLevel,
        trustSimulated: f.trustSimulated,
        institutionName: f.institution.name,
        institutionCode: f.institution.institutionCode,
        createdAt: f.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 2. GET /dashboard/drilldown/expiry-band?band=days30|days60|days90|pastMaturity
dashboardRouter.get('/drilldown/expiry-band', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdrWhere = buildFdrWhere(req)
    fdrWhere.lifecycleStatus = { notIn: ['RELEASED', 'RENEWED'] }

    const now = new Date()
    const todayMs = now.getTime()
    const days30Ahead = new Date(todayMs + 30 * 24 * 3600 * 1000)
    const days60Ahead = new Date(todayMs + 60 * 24 * 3600 * 1000)
    const days90Ahead = new Date(todayMs + 90 * 24 * 3600 * 1000)

    const band = String(req.query.band || 'days30')
    if (band === 'pastMaturity') {
      fdrWhere.maturityDate = { lt: now }
    } else if (band === 'days30') {
      fdrWhere.maturityDate = { gte: now, lte: days30Ahead }
    } else if (band === 'days60') {
      fdrWhere.maturityDate = { gt: days30Ahead, lte: days60Ahead }
    } else if (band === 'days90') {
      fdrWhere.maturityDate = { gt: days60Ahead, lte: days90Ahead }
    }

    const list = await prisma.fDR.findMany({
      where: fdrWhere,
      include: { institution: true },
      orderBy: { maturityDate: 'asc' },
    })

    res.json({
      band,
      total: list.length,
      instruments: list.map((f) => ({
        id: f.id,
        referenceNumber: f.referenceNumber,
        bankName: f.bankName,
        depositAmount: serializeAmount(f.depositAmount),
        maturityDate: f.maturityDate.toISOString().slice(0, 10),
        institutionName: f.institution.name,
        lifecycleStatus: f.lifecycleStatus,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 3. GET /dashboard/drilldown/stuck-stages?office=...
dashboardRouter.get('/drilldown/stuck-stages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isInstUser = req.user?.role === 'INSTITUTION_USER'
    const where: any = {
      status: 'ACTIVE',
      dueAt: { lt: new Date() },
    }

    if (req.query.office) {
      where.office = String(req.query.office)
    }

    if (isInstUser) {
      where.releaseRequest = { fdr: { institutionId: req.user?.institutionId } }
    }

    const list = await prisma.releaseStage.findMany({
      where,
      include: {
        releaseRequest: {
          include: {
            fdr: { include: { institution: true } },
            requester: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
    })

    const nowMs = Date.now()
    res.json({
      total: list.length,
      stages: list.map((s) => ({
        id: s.id,
        releaseRequestId: s.releaseRequestId,
        office: s.office,
        order: s.order,
        dueAt: s.dueAt?.toISOString(),
        overdueDays: s.dueAt ? Math.ceil((nowMs - new Date(s.dueAt).getTime()) / (1000 * 3600 * 24)) : 0,
        fdrNumber: s.releaseRequest.fdr.referenceNumber,
        amount: serializeAmount(s.releaseRequest.amount),
        institutionName: s.releaseRequest.fdr.institution.name,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 4. GET /dashboard/drilldown/missing-documents
dashboardRouter.get('/drilldown/missing-documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdrWhere = buildFdrWhere(req)
    fdrWhere.lifecycleStatus = { notIn: ['RELEASED', 'RENEWED'] }
    fdrWhere.documents = { none: {} }

    const list = await prisma.fDR.findMany({
      where: fdrWhere,
      include: { institution: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      total: list.length,
      instruments: list.map((f) => ({
        id: f.id,
        referenceNumber: f.referenceNumber,
        bankName: f.bankName,
        instrumentType: f.instrumentType,
        depositAmount: serializeAmount(f.depositAmount),
        institutionName: f.institution.name,
        verificationStatus: f.verificationStatus,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 5. GET /dashboard/drilldown/active-holds
dashboardRouter.get('/drilldown/active-holds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isInstUser = req.user?.role === 'INSTITUTION_USER'
    const where: any = { active: true }

    if (isInstUser) {
      where.institutionId = req.user?.institutionId
    }

    const list = await prisma.hold.findMany({
      where,
      include: { institution: true },
      orderBy: { placedAt: 'desc' },
    })

    res.json({
      total: list.length,
      holds: list.map((h) => ({
        id: h.id,
        institutionId: h.institutionId,
        institutionName: h.institution.name,
        institutionCode: h.institution.institutionCode,
        reason: h.reason,
        sourceBody: h.sourceBody,
        referenceNo: h.referenceNo,
        placedAt: h.placedAt.toISOString(),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// 6. GET /dashboard/drilldown/unconfirmed-liens
dashboardRouter.get('/drilldown/unconfirmed-liens', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdrWhere = buildFdrWhere(req)
    fdrWhere.lifecycleStatus = { notIn: ['RELEASED', 'RENEWED'] }
    fdrWhere.lienStatus = { notIn: ['CONFIRMED_BY_STAFF', 'CONFIRMED_BY_BANK'] }

    const list = await prisma.fDR.findMany({
      where: fdrWhere,
      include: { institution: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      total: list.length,
      instruments: list.map((f) => ({
        id: f.id,
        referenceNumber: f.referenceNumber,
        bankName: f.bankName,
        instrumentType: f.instrumentType,
        depositAmount: serializeAmount(f.depositAmount),
        lienStatus: f.lienStatus,
        beneficiaryName: f.beneficiaryName,
        institutionName: f.institution.name,
      })),
    })
  } catch (err) {
    next(err)
  }
})
