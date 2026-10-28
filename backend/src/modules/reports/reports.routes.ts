import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'

export const reportsRouter = Router()

// GET /reports/fdrs
reportsRouter.get('/fdrs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type = 'all',
      institution,
      status,
      bank,
      instrumentType,
      from,
      to,
      format = 'json',
    } = req.query as Record<string, string>

    const where: any = {}

    // Institution scoping
    if (req.user?.role === 'INSTITUTION_USER') {
      where.institutionId = req.user.institutionId
    } else if (institution && institution !== 'all') {
      where.institutionId = institution
    }

    if (bank && bank !== 'all') {
      where.bankName = { contains: bank }
    }

    if (instrumentType && instrumentType !== 'all') {
      where.instrumentType = instrumentType
    }

    if (status && status !== 'all') {
      where.OR = [
        { lifecycleStatus: status.toUpperCase().replace(/\s+/g, '_') },
        { verificationStatus: status.toUpperCase().replace(/\s+/g, '_') },
      ]
    }

    if (from || to) {
      where.maturityDate = {}
      if (from) where.maturityDate.gte = new Date(from)
      if (to) where.maturityDate.lte = new Date(to)
    }

    const now = new Date()

    if (type === 'pending-verification') {
      where.verificationStatus = { in: ['SUBMITTED', 'UNDER_REVIEW'] }
    } else if (type === 'upcoming-maturity') {
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      where.maturityDate = { gte: now, lte: thirtyDaysAhead }
      where.lifecycleStatus = { notIn: ['RELEASED', 'RENEWED'] }
    } else if (type === 'overdue') {
      where.maturityDate = { lt: now }
      where.lifecycleStatus = { notIn: ['RELEASED', 'RENEWED'] }
    }

    let records = await prisma.fDR.findMany({
      where,
      include: {
        institution: true,
        documents: true,
      },
      orderBy: { maturityDate: 'asc' },
    })

    if (type === 'missing-documents') {
      records = records.filter((r) => r.documents.length === 0)
    }

    // Log export in AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        action: 'REPORT_EXPORT',
        entityType: 'Report',
        entityId: `fdrs-${type}-${format}`,
        changeSummary: `Exported FDR report (type: ${type}, format: ${format}, count: ${records.length}).`,
        metadata: JSON.stringify({ filters: req.query, count: records.length }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    const formatted = records.map((f) => ({
      fdrNumber: f.referenceNumber,
      institutionCode: f.institution?.institutionCode || '',
      institutionName: f.institution?.name || '',
      bankName: f.bankName,
      branchName: f.branchName,
      amount: f.depositAmount,
      interestRate: f.interestRate,
      instrumentType: f.instrumentType,
      issueDate: new Date(f.issueDate).toISOString().slice(0, 10),
      maturityDate: new Date(f.maturityDate).toISOString().slice(0, 10),
      verificationStatus: f.verificationStatus,
      lifecycleStatus: f.lifecycleStatus,
      riskLevel: f.riskLevel,
      documentsCount: f.documents.length,
    }))

    if (format === 'csv') {
      const headers = [
        'FDR Number',
        'Institution Code',
        'Institution Name',
        'Bank Name',
        'Branch Name',
        'Amount (INR)',
        'Interest Rate (%)',
        'Instrument Type',
        'Issue Date',
        'Maturity Date',
        'Verification Status',
        'Lifecycle Status',
        'Risk Level',
        'Documents Attached',
      ]

      const csvRows = [headers.join(',')]
      for (const row of formatted) {
        csvRows.push(
          [
            `"${row.fdrNumber}"`,
            `"${row.institutionCode}"`,
            `"${row.institutionName.replace(/"/g, '""')}"`,
            `"${row.bankName.replace(/"/g, '""')}"`,
            `"${row.branchName.replace(/"/g, '""')}"`,
            row.amount,
            row.interestRate,
            `"${row.instrumentType}"`,
            row.issueDate,
            row.maturityDate,
            `"${row.verificationStatus}"`,
            `"${row.lifecycleStatus}"`,
            `"${row.riskLevel}"`,
            row.documentsCount,
          ].join(',')
        )
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="fdr-report-${type}-${Date.now()}.csv"`)
      res.send(csvRows.join('\n'))
      return
    }

    res.json({
      type,
      totalCount: formatted.length,
      data: formatted,
    })
  } catch (err) {
    next(err)
  }
})
