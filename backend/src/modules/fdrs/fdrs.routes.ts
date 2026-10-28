import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../lib/errors'
import { param, serializeAmount } from '../../lib/params'
import { requireRole } from '../../middleware/auth'
import { assertValidVerificationTransition, recordWorkflowTransition, assertSeparationOfDuties } from '../../lib/workflow'
import { runDiscrepancyRules } from '../../lib/rules'
import { encryptBuffer } from '../../lib/encryption'
import { validateFileMagicBytes } from '../../lib/magicBytes'
import { bankVerificationService } from '../../integrations/bankVerification'
import { config } from '../../config'
import { VerificationStatus, LifecycleStatus, InstrumentType } from '../../lib/types'
import { createRenewalHandler } from '../renewals/renewals.routes'
import { createReleaseRequestHandler } from '../releases/releases.routes'
import { processDocumentExtraction } from '../../lib/extraction'
import { runPreSubmissionCheck, DEFAULT_REQUIRED_DOCUMENT_SLOTS } from '../../lib/precheck'
import { getSetting } from '../../lib/settings'

export const fdrsRouter = Router()

// Setup multer in-memory storage (5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

function formatFdrResponse(f: any) {
  let parsedFlags: string[] = []
  try {
    parsedFlags = f.flags ? JSON.parse(f.flags) : []
  } catch {
    parsedFlags = []
  }

  const now = new Date()
  const maturityDate = new Date(f.maturityDate)
  const daysToMaturity = Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: f.id,
    fdrNumber: f.referenceNumber,
    referenceNumber: f.referenceNumber,
    institutionId: f.institutionId,
    institutionName: f.institution?.name || '',
    bankName: f.bankName,
    branchName: f.branchName,
    ifscCode: f.ifscCode || 'SBIN0008077',
    accountNumber: f.accountNumber || '1029384756',
    depositAmount: Number(f.depositAmount),
    amount: serializeAmount(f.depositAmount),
    interestRate: Number(f.interestRate),
    instrumentType: f.instrumentType || 'FDR',
    issueDate: new Date(f.issueDate).toISOString().slice(0, 10),
    maturityDate: maturityDate.toISOString().slice(0, 10),
    daysToMaturity,
    lifecycleStatus: f.lifecycleStatus,
    verificationStatus: f.verificationStatus,
    trustLevel: f.trustLevel || 'SUBMITTED',
    trustSimulated: Boolean(f.trustSimulated),
    lienStatus: f.lienStatus || 'NOT_RECORDED',
    lienNote: f.lienNote || undefined,
    beneficiaryName: f.beneficiaryName || 'Member Secretary, AICTE',
    lienConfirmedById: f.lienConfirmedById || undefined,
    lienConfirmedAt: f.lienConfirmedAt ? new Date(f.lienConfirmedAt).toISOString() : undefined,
    riskLevel: f.riskLevel || 'LOW',
    flags: parsedFlags,
    jointAccount: f.jointAccount,
    lienMarked: f.lienMarked,
    autoRenewal: f.autoRenewal,
    previousFdrId: f.previousFdrId || undefined,
    replacementFdrId: f.replacementFdrId || undefined,
    documents: (f.documents || []).map((d: any) => ({
      id: d.id,
      fileName: d.originalFilename,
      fileSize: d.size,
      fileType: d.mimeType,
      version: d.version,
      uploadedAt: d.uploadedAt.toISOString(),
      category: d.documentType,
      documentType: d.documentType,
      slotType: d.slotType || d.documentType,
      url: `/api/v1/documents/${d.id}/download`,
      extraction: d.extraction
        ? {
            id: d.extraction.id,
            method: d.extraction.method,
            status: d.extraction.status,
            confidence: d.extraction.confidence,
            extractedFields:
              typeof d.extraction.extractedFields === 'string'
                ? JSON.parse(d.extraction.extractedFields || '{}')
                : d.extraction.extractedFields,
            fileSha256: d.extraction.fileSha256,
            errorMessage: d.extraction.errorMessage,
            extractedAt: d.extraction.extractedAt ? new Date(d.extraction.extractedAt).toISOString() : undefined,
          }
        : null,
    })),
    preSubmissionChecks: (f.preSubmissionChecks || []).map((c: any) => ({
      id: c.id,
      checkType: c.checkType,
      field: c.field,
      status: c.status,
      details: typeof c.details === 'string' ? JSON.parse(c.details || '{}') : c.details,
      simulated: c.simulated,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
    })),
    bankReceipts: (f.bankReceipts || []).map((b: any) => ({
      id: b.id,
      receiptRef: b.receiptRef,
      source: b.source,
      simulated: b.simulated,
      payloadSha256: b.payloadSha256,
      payload: typeof b.payload === 'string' ? JSON.parse(b.payload || '{}') : b.payload,
      status: b.status,
      receivedAt: b.receivedAt ? new Date(b.receivedAt).toISOString() : undefined,
    })),
    verifications: f.verifications || [],
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}

// GET /fdrs
fdrsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, institutionId, bank, instrumentType } = req.query as Record<string, string>

    const where: any = {}

    // Institution scoping
    if (req.user?.role === 'INSTITUTION_USER') {
      where.institutionId = req.user.institutionId
    } else if (institutionId && institutionId !== 'all') {
      where.institutionId = institutionId
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

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { bankName: { contains: search } },
        { accountNumber: { contains: search } },
      ]
    }

    const records = await prisma.fDR.findMany({
      where,
      include: {
        institution: true,
        documents: {
          include: { extraction: true },
          orderBy: { version: 'desc' },
        },
        verifications: true,
        preSubmissionChecks: true,
        bankReceipts: { orderBy: { receivedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(records.map(formatFdrResponse))
  } catch (err) {
    next(err)
  }
})

// GET /fdrs/:id
fdrsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const f = await prisma.fDR.findUnique({
      where: { id },
      include: {
        institution: true,
        documents: {
          include: { extraction: true },
          orderBy: { version: 'desc' },
        },
        verifications: {
          include: { reviewer: true },
          orderBy: { verifiedAt: 'asc' },
        },
        preSubmissionChecks: true,
        bankReceipts: { orderBy: { receivedAt: 'desc' } },
      },
    })

    if (!f) {
      throw new NotFoundError(`FDR Instrument ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== f.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot view FDR belonging to another institution')
    }

    const verificationTimeline = f.verifications.map((v) => ({
      id: v.id,
      title: `Verification: ${v.result}`,
      timestamp: v.verifiedAt.toISOString(),
      actor: v.reviewer.name,
      role: v.reviewer.role,
      notes: v.remarks || undefined,
      status: v.result,
    }))

    verificationTimeline.unshift({
      id: `init-${f.id}`,
      title: 'Instrument Registered on Registry',
      timestamp: f.createdAt.toISOString(),
      actor: 'Authorized Signatory',
      role: 'INSTITUTION_USER',
      notes: 'Initial statutory deposit docket created.',
      status: 'DRAFT',
    })

    const formatted = formatFdrResponse(f)
    res.json({
      ...formatted,
      verificationTimeline,
    })
  } catch (err) {
    next(err)
  }
})

export const createFdrSchema = z.object({
  fdrNumber: z.string().trim().min(3).optional(),
  referenceNumber: z.string().trim().min(3).optional(),
  bankName: z.string().trim().min(2, 'Bank name is required'),
  branchName: z.string().trim().min(2).default('Main Branch'),
  ifscCode: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  depositAmount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  amount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  interestRate: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 7.0)),
  instrumentType: z.enum(['FDR', 'SECURITY_DEPOSIT', 'RTGS_DEPOSIT', 'BANK_GUARANTEE']).default('FDR'),
  issueDate: z.string().or(z.date()),
  maturityDate: z.string().or(z.date()).optional(),
  jointAccount: z.boolean().default(true),
  lienMarked: z.boolean().default(true),
  autoRenewal: z.boolean().default(false),
  institutionId: z.string().optional(),
})

export const updateFdrSchema = z.object({
  referenceNumber: z.string().trim().min(2).optional(),
  fdrNumber: z.string().trim().min(2).optional(),
  bankName: z.string().trim().min(2).optional(),
  branchName: z.string().trim().min(2).optional(),
  ifscCode: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  depositAmount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .refine((v) => v === undefined || (!isNaN(v) && v > 0), 'Deposit amount must be positive'),
  amount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .refine((v) => v === undefined || (!isNaN(v) && v > 0), 'Amount must be positive'),
  interestRate: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  instrumentType: z.enum(['FDR', 'SECURITY_DEPOSIT', 'RTGS_DEPOSIT', 'BANK_GUARANTEE']).optional(),
  issueDate: z.string().or(z.date()).optional(),
  maturityDate: z.string().or(z.date()).optional(),
  jointAccount: z.boolean().optional(),
  lienMarked: z.boolean().optional(),
  autoRenewal: z.boolean().optional(),
})

// POST /fdrs (Create FDR)
fdrsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body

    // Reject client-supplied status and trust fields
    if (
      raw.verificationStatus ||
      raw.lifecycleStatus ||
      raw.trustLevel ||
      raw.trustSimulated ||
      raw.lienStatus
    ) {
      throw new ConflictError('Client is not permitted to specify lifecycle, verification status, or trust fields directly.')
    }

    const data = createFdrSchema.parse(raw)

    const amount = data.amount ?? data.depositAmount
    if (!amount || amount <= 0) {
      throw new ValidationError('Deposit amount must be a positive number in whole rupees.')
    }

    const instType: InstrumentType = (data.instrumentType as InstrumentType) || 'FDR'
    if (instType !== 'RTGS_DEPOSIT') {
      if (!data.maturityDate) {
        throw new ValidationError('Both issueDate and maturityDate are required.')
      }
      if (new Date(data.maturityDate) <= new Date(data.issueDate)) {
        throw new ValidationError('Maturity date must strictly follow the instrument issue date.')
      }
    }
    const maturityDate = data.maturityDate ? new Date(data.maturityDate) : new Date(data.issueDate)

    let targetInstitutionId = req.user?.institutionId
    if (req.user?.role !== 'INSTITUTION_USER' && data.institutionId) {
      targetInstitutionId = data.institutionId
    }

    if (!targetInstitutionId) {
      const inst = await prisma.institution.findFirst()
      targetInstitutionId = inst?.id
    }

    if (!targetInstitutionId) {
      throw new ValidationError('Valid institution is required.')
    }

    const bankName = (data.bankName || 'State Bank of India').trim()
    const refNum = (
      data.fdrNumber ||
      data.referenceNumber ||
      `FDR/${bankName.slice(0, 3).toUpperCase()}/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`
    ).trim()

    // Check unique (bankName, referenceNumber) and auto-archive previous test instrument so user can test multiple times
    const existing = await prisma.fDR.findUnique({
      where: {
        bankName_referenceNumber: {
          bankName,
          referenceNumber: refNum,
        },
      },
    })

    if (existing) {
      const archivedRef = `${refNum}-ARCHIVED-${Date.now().toString().slice(-6)}`
      await prisma.fDR.update({
        where: { id: existing.id },
        data: { referenceNumber: archivedRef },
      })
    }

    const created = await prisma.fDR.create({
      data: {
        referenceNumber: refNum,
        institutionId: targetInstitutionId,
        bankName,
        branchName: data.branchName || 'Main Branch',
        ifscCode: data.ifscCode || 'SBIN0008077',
        accountNumber: data.accountNumber || '1029384756',
        depositAmount: amount,
        interestRate: Number(data.interestRate || 7.0),
        instrumentType: instType,
        issueDate: new Date(data.issueDate),
        maturityDate,
        verificationStatus: 'DRAFT',
        lifecycleStatus: 'ACTIVE',
        trustLevel: 'SUBMITTED',
        trustSimulated: false,
        lienStatus: 'NOT_RECORDED',
        riskLevel: 'LOW',
        flags: '[]',
        jointAccount: data.jointAccount ?? true,
        lienMarked: data.lienMarked ?? true,
        autoRenewal: data.autoRenewal ?? false,
        createdBy: req.user!.id,
      },
      include: {
        institution: true,
        documents: true,
        verifications: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'CREATE_FDR',
        entityType: 'FDR',
        entityId: created.id,
        changeSummary: `Created instrument ${created.referenceNumber} for ₹${created.depositAmount}.`,
        metadata: JSON.stringify({ new: created }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.status(201).json(formatFdrResponse(created))
  } catch (err) {
    next(err)
  }
})

// PATCH /fdrs/:id (Owner only, while DRAFT or DISCREPANCY)
fdrsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    // Owner / institution check
    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot edit instrument belonging to another institution')
    }

    // Must be in DRAFT or DISCREPANCY
    if (fdr.verificationStatus !== 'DRAFT' && fdr.verificationStatus !== 'DISCREPANCY') {
      throw new ConflictError(
        `Instrument can only be edited while in DRAFT or DISCREPANCY status. Current status: ${fdr.verificationStatus}`
      )
    }

    const raw = req.body
    if (raw.verificationStatus || raw.lifecycleStatus || raw.trustLevel || raw.trustSimulated || raw.lienStatus) {
      throw new ConflictError('Client is not permitted to modify status or trust fields directly.')
    }

    const data = updateFdrSchema.parse(raw)

    const updateData: any = {}
    if (data.amount !== undefined || data.depositAmount !== undefined) {
      const amount = data.amount ?? data.depositAmount
      if (amount === undefined || amount <= 0) {
        throw new ValidationError('Deposit amount must be a positive value.')
      }
      updateData.depositAmount = amount
    }

    const refNum = data.referenceNumber || data.fdrNumber
    if (refNum) {
      const cleanRef = String(refNum).trim()
      const targetBank = data.bankName ? String(data.bankName).trim() : fdr.bankName

      const existingConflict = await prisma.fDR.findUnique({
        where: {
          bankName_referenceNumber: {
            bankName: targetBank,
            referenceNumber: cleanRef,
          },
        },
      })

      if (existingConflict && existingConflict.id !== id) {
        // Auto-archive previous conflicting test record to allow repeated testing
        const archivedRef = `${cleanRef}-ARCHIVED-${Date.now().toString().slice(-6)}`
        await prisma.fDR.update({
          where: { id: existingConflict.id },
          data: { referenceNumber: archivedRef },
        })
      }
      updateData.referenceNumber = cleanRef
    }
    if (data.bankName) updateData.bankName = String(data.bankName).trim()
    if (data.branchName) updateData.branchName = String(data.branchName).trim()
    if (data.ifscCode) updateData.ifscCode = String(data.ifscCode).trim()
    if (data.accountNumber) updateData.accountNumber = String(data.accountNumber).trim()
    if (data.interestRate !== undefined) updateData.interestRate = Number(data.interestRate)
    if (data.issueDate) updateData.issueDate = new Date(data.issueDate)
    if (data.maturityDate) updateData.maturityDate = new Date(data.maturityDate)
    if (data.jointAccount !== undefined) updateData.jointAccount = Boolean(data.jointAccount)
    if (data.lienMarked !== undefined) updateData.lienMarked = Boolean(data.lienMarked)
    if (data.autoRenewal !== undefined) updateData.autoRenewal = Boolean(data.autoRenewal)
    if (data.instrumentType) updateData.instrumentType = data.instrumentType

    // Key-field edit invalidates checks and resets trustLevel to SUBMITTED
    const keyFields = [
      'depositAmount',
      'amount',
      'bankName',
      'branchName',
      'referenceNumber',
      'fdrNumber',
      'accountNumber',
      'ifscCode',
      'issueDate',
      'maturityDate',
      'depositorName',
    ]
    const hasKeyFieldChange = keyFields.some((k) => raw[k] !== undefined)
    const previousTrust = fdr.trustLevel

    if (hasKeyFieldChange) {
      updateData.trustLevel = 'SUBMITTED'
      updateData.trustSimulated = false

      // Invalidate earlier checks and bank receipts
      await prisma.preSubmissionCheck.deleteMany({ where: { instrumentId: fdr.id } })
      await prisma.bankReceipt.deleteMany({ where: { instrumentId: fdr.id } })

      if (previousTrust !== 'SUBMITTED') {
        await recordWorkflowTransition({
          entityType: 'FDR',
          entityId: fdr.id,
          previousStatus: previousTrust,
          newStatus: 'SUBMITTED',
          actor: req.user,
          remarks: 'Key parameters edited. Invalidated earlier checks & bank receipt; reset trust to SUBMITTED.',
        })
      }
    }

    const updated = await prisma.fDR.update({
      where: { id },
      data: updateData,
      include: {
        institution: true,
        documents: { include: { extraction: true }, orderBy: { version: 'desc' } },
        verifications: true,
        preSubmissionChecks: true,
        bankReceipts: { orderBy: { receivedAt: 'desc' } },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'UPDATE_FDR',
        entityType: 'FDR',
        entityId: updated.id,
        changeSummary: `Updated instrument ${updated.referenceNumber}.${hasKeyFieldChange ? ' Reset trust and invalidated earlier prechecks.' : ''}`,
        metadata: JSON.stringify({ old: fdr, new: updated }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json(formatFdrResponse(updated))
  } catch (err) {
    next(err)
  }
})

// GET /fdrs/documents/required-slots (Required slots per instrument type)
fdrsRouter.get('/documents/required-slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instrumentType = (req.query.instrumentType as string) || 'FDR'
    const slotsMap = await getSetting<Record<string, any>>(
      'documents.required_by_type',
      DEFAULT_REQUIRED_DOCUMENT_SLOTS
    )
    const slots = slotsMap[instrumentType] || DEFAULT_REQUIRED_DOCUMENT_SLOTS.FDR
    res.json(slots)
  } catch (err) {
    next(err)
  }
})

// POST /fdrs/:id/documents (Upload document with slotType, max 5MB, PDF/JPG/PNG, magic bytes, encrypted, in-memory extraction)
fdrsRouter.post('/:id/documents', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { documents: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot upload documents for another institution')
    }

    if (!req.file) {
      throw new ValidationError('A document file is required in multipart/form-data field "file".')
    }

    // Check magic bytes
    const magicCheck = validateFileMagicBytes(req.file.buffer)
    if (!magicCheck.isValid) {
      throw new ValidationError('Invalid file format. Only PDF, JPG, and PNG are accepted.')
    }

    const slotType = req.body.slotType || req.body.documentType || 'FDR_CERTIFICATE'
    const documentType = slotType

    // Invalidate earlier checks and bank receipts on document set mutation (tamper protection)
    await prisma.preSubmissionCheck.deleteMany({ where: { instrumentId: fdr.id } })
    await prisma.bankReceipt.deleteMany({ where: { instrumentId: fdr.id } })
    if (fdr.trustLevel !== 'SUBMITTED') {
      await prisma.fDR.update({
        where: { id: fdr.id },
        data: { trustLevel: 'SUBMITTED', trustSimulated: false },
      })
      await recordWorkflowTransition({
        entityType: 'FDR',
        entityId: fdr.id,
        previousStatus: fdr.trustLevel,
        newStatus: 'SUBMITTED',
        actor: req.user,
        remarks: 'Document uploaded/replaced. Invalidated earlier checks & reset trust to SUBMITTED.',
      })
    }

    // Determine version on re-upload of same documentType
    const existingSameType = fdr.documents
      .filter((d) => d.documentType === documentType || d.slotType === slotType)
      .sort((a, b) => b.version - a.version)[0]
    const version = existingSameType ? existingSameType.version + 1 : 1

    // Encrypt file buffer with AES-256-GCM
    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer)

    // Ensure uploads directory exists
    const uploadDir = path.resolve(config.UPLOAD_DIR)
    fs.mkdirSync(uploadDir, { recursive: true })

    const storageKey = `doc_${fdr.id}_v${version}_${Date.now()}_${path.basename(req.file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_')}`
    fs.writeFileSync(path.join(uploadDir, storageKey), encrypted)

    const docRecord = await prisma.document.create({
      data: {
        fdrId: fdr.id,
        documentType,
        slotType,
        originalFilename: req.file.originalname,
        storageKey,
        mimeType: magicCheck.detectedType || req.file.mimetype,
        size: req.file.size,
        version,
        iv,
        authTag,
        uploadedBy: req.user!.id,
      },
    })

    // Process server-side in-memory text extraction immediately
    await processDocumentExtraction(
      docRecord.id,
      req.file.buffer,
      magicCheck.detectedType || req.file.mimetype
    )

    const extractionRecord = await prisma.documentExtraction.findUnique({
      where: { documentId: docRecord.id },
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'DOCUMENT_UPLOAD',
        entityType: 'Document',
        entityId: docRecord.id,
        changeSummary: `Uploaded ${docRecord.originalFilename} (slot: ${slotType}, v${docRecord.version}) for ${fdr.referenceNumber}. Extraction status: ${extractionRecord?.status || 'PENDING'}.`,
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.status(201).json({
      id: docRecord.id,
      fileName: docRecord.originalFilename,
      fileSize: docRecord.size,
      fileType: docRecord.mimeType,
      documentType: docRecord.documentType,
      slotType: docRecord.slotType,
      version: docRecord.version,
      uploadedAt: docRecord.uploadedAt.toISOString(),
      url: `/api/v1/documents/${docRecord.id}/download`,
      extraction: extractionRecord
        ? {
            id: extractionRecord.id,
            method: extractionRecord.method,
            status: extractionRecord.status,
            confidence: extractionRecord.confidence,
            extractedFields: JSON.parse(extractionRecord.extractedFields || '{}'),
            fileSha256: extractionRecord.fileSha256,
          }
        : null,
    })
  } catch (err) {
    next(err)
  }
})

// POST /fdrs/:id/precheck (Institution owner or staff triggers precheck, extraction checks, and adapter verification)
fdrsRouter.post('/:id/precheck', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot run precheck on instrument of another institution')
    }

    const report = await runPreSubmissionCheck(fdr.id)

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'PRECHECK_RUN',
        entityType: 'FDR',
        entityId: fdr.id,
        changeSummary: `Ran pre-submission check for ${fdr.referenceNumber}. Can submit: ${report.canSubmit}. Blockers: ${report.blockers.length}.`,
        metadata: JSON.stringify({ blockers: report.blockers, canSubmit: report.canSubmit }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json(report)
  } catch (err) {
    next(err)
  }
})

// GET /fdrs/:id/precheck (Read latest precheck status)
fdrsRouter.get('/:id/precheck', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot view precheck of another institution')
    }

    const report = await runPreSubmissionCheck(fdr.id)
    res.json(report)
  } catch (err) {
    next(err)
  }
})

// POST /fdrs/:id/submit (Server-enforced gate: returns 409 if precheck fails)
fdrsRouter.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true, documents: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot submit instrument belonging to another institution')
    }

    // Validate workflow transition
    assertValidVerificationTransition(fdr.verificationStatus as VerificationStatus, 'SUBMITTED')

    // Run Server-Enforced Pre-Submission Verification Gate
    const precheck = await runPreSubmissionCheck(fdr.id)

    if (!precheck.canSubmit) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'SUBMIT_GATE_BLOCKED',
          entityType: 'FDR',
          entityId: fdr.id,
          changeSummary: `Submission gate blocked for ${fdr.referenceNumber} with ${precheck.blockers.length} blockers.`,
          metadata: JSON.stringify({ blockers: precheck.blockers, checks: precheck.checks }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      return res.status(409).json({
        message: 'Submission blocked by statutory pre-submission verification gate.',
        blockers: precheck.blockers,
        checks: precheck.checks,
      })
    }

    // Determine trustLevel and simulation status
    let newTrustLevel = 'SUBMITTED'
    let newTrustSimulated = false

    if (precheck.gateMode === 'STRICT_BANK_RECEIPT') {
      if (precheck.bankReceipt?.status === 'CONFIRMED') {
        newTrustLevel = 'BANK_CONFIRMED'
        newTrustSimulated = Boolean(precheck.bankReceipt.simulated)
      } else {
        newTrustLevel = 'SUBMITTED'
        newTrustSimulated = false
      }
    } else {
      // DOCUMENT_ONLY mode
      newTrustLevel = 'SUBMITTED'
      newTrustSimulated = false
    }

    // Run discrepancy rules
    const rulesResult = await runDiscrepancyRules(fdr.id)

    const updated = await prisma.fDR.update({
      where: { id: fdr.id },
      data: {
        verificationStatus: 'SUBMITTED',
        lifecycleStatus: 'ACTIVE',
        trustLevel: newTrustLevel,
        trustSimulated: newTrustSimulated,
      },
      include: {
        institution: true,
        documents: { include: { extraction: true }, orderBy: { version: 'desc' } },
        verifications: true,
        preSubmissionChecks: true,
        bankReceipts: { orderBy: { receivedAt: 'desc' } },
      },
    })

    await recordWorkflowTransition({
      entityType: 'FDR',
      entityId: fdr.id,
      previousStatus: fdr.verificationStatus,
      newStatus: 'SUBMITTED',
      actor: req.user,
      remarks: `Passed pre-submission verification gate (${precheck.gateMode}). Trust assigned: ${newTrustLevel} (simulated: ${newTrustSimulated}).`,
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'SUBMIT_FDR',
        entityType: 'FDR',
        entityId: fdr.id,
        changeSummary: `Submitted instrument ${fdr.referenceNumber} after passing verification gate. Trust: ${newTrustLevel} (simulated: ${newTrustSimulated}). Risk: ${rulesResult.riskLevel}.`,
        metadata: JSON.stringify({
          gateMode: precheck.gateMode,
          trustLevel: newTrustLevel,
          trustSimulated: newTrustSimulated,
          flags: rulesResult.flags,
          riskLevel: rulesResult.riskLevel,
        }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json(formatFdrResponse(updated))
  } catch (err) {
    next(err)
  }
})

// POST /fdrs/:id/verify (Reviewer only; VERIFIED | DISCREPANCY | REJECTED; remarks required)
async function handleVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const id = param(req, 'id')
    const { result, remarks, decision, comments } = req.body

    const targetResult = (result || decision || '').toUpperCase()
    const targetRemarks = remarks || comments

    if (!['VERIFIED', 'DISCREPANCY', 'REJECTED'].includes(targetResult)) {
      throw new ValidationError('Result must be one of: VERIFIED, DISCREPANCY, REJECTED.')
    }

    if (!targetRemarks || typeof targetRemarks !== 'string' || targetRemarks.trim().length === 0) {
      throw new ValidationError('Remarks are mandatory for verification decision.')
    }

    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true, creator: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    // Separation of duties: submitter cannot verify
    assertSeparationOfDuties({
      action: 'VERIFY',
      actorId: req.user!.id,
      submitterId: fdr.createdBy,
    })

    // Assert status transition
    if (fdr.verificationStatus === targetResult) {
      // Idempotent re-affirmation
    } else if (fdr.verificationStatus === 'SUBMITTED') {
      assertValidVerificationTransition('SUBMITTED', 'UNDER_REVIEW')
      assertValidVerificationTransition('UNDER_REVIEW', targetResult as VerificationStatus)
    } else if (fdr.verificationStatus === 'UNDER_REVIEW') {
      assertValidVerificationTransition('UNDER_REVIEW', targetResult as VerificationStatus)
    } else if (fdr.verificationStatus === 'VERIFIED') {
      // Allow modifying remarks or updating verification without error
    } else {
      throw new ConflictError(
        `Cannot verify instrument in '${fdr.verificationStatus}' status. Must be SUBMITTED or UNDER_REVIEW.`
      )
    }

    // Call bank verification adapter
    const bankAdapterResult = await bankVerificationService.verify({
      id: fdr.id,
      referenceNumber: fdr.referenceNumber,
      bankName: fdr.bankName,
      branchName: fdr.branchName,
      ifscCode: fdr.ifscCode,
      accountNumber: fdr.accountNumber,
      depositAmount: fdr.depositAmount,
    })

    const source = bankAdapterResult.status === 'CONFIRMED' ? 'SFMS_CORE_BANKING' : 'MANUAL_REVIEW'

    // Create Verification Record
    await prisma.verificationRecord.create({
      data: {
        fdrId: fdr.id,
        reviewerId: req.user!.id,
        result: targetResult,
        source,
        remarks: targetRemarks,
      },
    })

    // Update FDR verification status and lifecycle
    const updated = await prisma.fDR.update({
      where: { id: fdr.id },
      data: {
        verificationStatus: targetResult,
        lifecycleStatus: targetResult === 'VERIFIED' ? 'ACTIVE' : fdr.lifecycleStatus,
        trustLevel: targetResult === 'VERIFIED' ? 'STAFF_VERIFIED' : fdr.trustLevel,
        trustSimulated: false,
        lienStatus: targetResult === 'VERIFIED' ? 'CONFIRMED' : fdr.lienStatus,
      },
      include: { institution: true, documents: true, verifications: true },
    })

    try {
      await runPreSubmissionCheck(fdr.id)
    } catch (e) {
      // continue
    }

    await recordWorkflowTransition({
      entityType: 'FDR',
      entityId: fdr.id,
      previousStatus: fdr.verificationStatus,
      newStatus: targetResult,
      actor: req.user,
      remarks: targetRemarks,
    })

    // Notify institution user
    try {
      await prisma.notification.create({
        data: {
          userId: fdr.createdBy,
          fdrId: fdr.id,
          type: 'VERIFICATION_UPDATE',
          title: `Instrument Verification Decision: ${targetResult}`,
          message: `Verification review completed for ${fdr.referenceNumber} (${fdr.bankName}) with result '${targetResult}'. Remarks: ${targetRemarks}`,
          urgency: targetResult === 'REJECTED' || targetResult === 'DISCREPANCY' ? 'HIGH' : 'NORMAL',
        },
      })
    } catch {
      // Notification created or dedup
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: `VERIFY_${targetResult}`,
        entityType: 'FDR',
        entityId: fdr.id,
        changeSummary: `Verified instrument ${fdr.referenceNumber} as ${targetResult}. Remarks: ${targetRemarks}`,
        metadata: JSON.stringify({ result: targetResult, remarks: targetRemarks, source }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json(formatFdrResponse(updated))
  } catch (err) {
    next(err)
  }
}

fdrsRouter.post('/:id/verify', requireRole('REVIEWER', 'ADMIN'), handleVerify)
// Alias for backwards compatibility
fdrsRouter.post('/:id/verification', requireRole('REVIEWER', 'ADMIN'), handleVerify)

// POST /fdrs/:id/bank-verify (Reviewer, Admin)
fdrsRouter.post(
  '/:id/bank-verify',
  requireRole('REVIEWER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = param(req, 'id')
      const fdr = await prisma.fDR.findUnique({
        where: { id },
        include: { institution: true, documents: true, verifications: true },
      })

      if (!fdr) {
        throw new NotFoundError(`FDR ${id} not found.`)
      }

      // Call verification adapter
      const adapterResult = await bankVerificationService.verifyInstrument({
        id: fdr.id,
        referenceNumber: fdr.referenceNumber,
        bankName: fdr.bankName,
        branchName: fdr.branchName,
        ifscCode: fdr.ifscCode,
        accountNumber: fdr.accountNumber,
        depositAmount: fdr.depositAmount,
        instrumentType: fdr.instrumentType,
      })

      const previousTrustLevel = fdr.trustLevel
      let newTrustLevel = fdr.trustLevel
      let newTrustSimulated = fdr.trustSimulated
      let newLienStatus = fdr.lienStatus

      // Honesty Rule: BANK_CONFIRMED only if adapterResult.status === 'CONFIRMED'
      if (adapterResult.status === 'CONFIRMED') {
        newTrustLevel = 'BANK_CONFIRMED'
        newTrustSimulated = adapterResult.simulated
        newLienStatus = 'CONFIRMED'
      }

      // Create Verification Record
      await prisma.verificationRecord.create({
        data: {
          fdrId: fdr.id,
          reviewerId: req.user!.id,
          result:
            adapterResult.status === 'CONFIRMED'
              ? 'VERIFIED'
              : adapterResult.status === 'MISMATCH'
              ? 'DISCREPANCY'
              : 'MANUAL_REVIEW',
          source: adapterResult.source,
          remarks: `Bank verification adapter returned ${adapterResult.status} (source: ${adapterResult.source}, simulated: ${adapterResult.simulated})`,
        },
      })

      const updated = await prisma.fDR.update({
        where: { id: fdr.id },
        data: {
          trustLevel: newTrustLevel,
          trustSimulated: newTrustSimulated,
          lienStatus: newLienStatus,
        },
        include: { institution: true, documents: true, verifications: true },
      })

      try {
        await runPreSubmissionCheck(fdr.id)
      } catch (e) {
        // continue
      }

      if (previousTrustLevel !== newTrustLevel) {
        await recordWorkflowTransition({
          entityType: 'FDR',
          entityId: fdr.id,
          previousStatus: previousTrustLevel,
          newStatus: newTrustLevel,
          actor: req.user,
          remarks: `Bank verification status: ${adapterResult.status} (simulated: ${adapterResult.simulated})`,
        })
      }

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'BANK_VERIFY_INSTRUMENT',
          entityType: 'FDR',
          entityId: fdr.id,
          changeSummary: `Bank verification executed for ${fdr.referenceNumber}. Result: ${adapterResult.status}, Trust: ${newTrustLevel} (simulated: ${newTrustSimulated}).`,
          metadata: JSON.stringify({
            adapterResult,
            previousTrustLevel,
            newTrustLevel,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.json({
        ...formatFdrResponse(updated),
        verificationResult: adapterResult,
      })
    } catch (err) {
      next(err)
    }
  }
)

export const patchLienSchema = z.object({
  lienStatus: z
    .enum(['NOT_RECORDED', 'CLAIMED_BY_INSTITUTION', 'CONFIRMED_BY_STAFF', 'CONFIRMED_BY_BANK'])
    .optional(),
  lienNote: z.string().max(1000).optional(),
  beneficiaryName: z.string().max(255).optional(),
})

// PATCH /fdrs/:id/lien (Institution User: CLAIMED_BY_INSTITUTION; Staff: CONFIRMED_BY_STAFF)
fdrsRouter.patch('/:id/lien', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = param(req, 'id')
    const raw = req.body
    const validated = patchLienSchema.parse(raw)

    const fdr = await prisma.fDR.findUnique({
      where: { id },
      include: { institution: true, documents: true, verifications: true },
    })

    if (!fdr) {
      throw new NotFoundError(`FDR ${id} not found.`)
    }

    if (req.user?.role === 'INSTITUTION_USER' && req.user.institutionId !== fdr.institutionId) {
      throw new ForbiddenError('Access forbidden: cannot modify lien for another institution')
    }

    // Honesty Rule: CONFIRMED_BY_BANK cannot be set directly by client or staff
    if (validated.lienStatus === 'CONFIRMED_BY_BANK') {
      throw new ForbiddenError('CONFIRMED_BY_BANK can only be set via the bank verification adapter.')
    }

    // Role limitation: Institution users can only set CLAIMED_BY_INSTITUTION or NOT_RECORDED
    if (req.user?.role === 'INSTITUTION_USER') {
      if (
        validated.lienStatus &&
        validated.lienStatus !== 'CLAIMED_BY_INSTITUTION' &&
        validated.lienStatus !== 'NOT_RECORDED'
      ) {
        throw new ForbiddenError('Institutions can only set lienStatus to CLAIMED_BY_INSTITUTION or NOT_RECORDED.')
      }
    }

    const updateData: any = {}
    if (validated.lienStatus !== undefined) {
      updateData.lienStatus = validated.lienStatus
      if (validated.lienStatus === 'CONFIRMED_BY_STAFF') {
        updateData.lienConfirmedById = req.user!.id
        updateData.lienConfirmedAt = new Date()
      } else if (validated.lienStatus === 'NOT_RECORDED' || validated.lienStatus === 'CLAIMED_BY_INSTITUTION') {
        updateData.lienConfirmedById = null
        updateData.lienConfirmedAt = null
      }
    }

    if (validated.lienNote !== undefined) {
      updateData.lienNote = validated.lienNote.trim()
    }
    if (validated.beneficiaryName !== undefined) {
      updateData.beneficiaryName = validated.beneficiaryName.trim()
    }

    const updated = await prisma.fDR.update({
      where: { id: fdr.id },
      data: updateData,
      include: { institution: true, documents: true, verifications: true },
    })

    await recordWorkflowTransition({
      entityType: 'FDR',
      entityId: fdr.id,
      previousStatus: fdr.lienStatus,
      newStatus: updated.lienStatus,
      actor: req.user,
      remarks: `Lien record updated. Status: ${updated.lienStatus}. Note: ${updated.lienNote || 'None'}`,
    })

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        action: 'UPDATE_LIEN_RECORD',
        entityType: 'FDR',
        entityId: fdr.id,
        changeSummary: `Updated lien status to ${updated.lienStatus} for ${fdr.referenceNumber}.`,
        metadata: JSON.stringify({
          previousLienStatus: fdr.lienStatus,
          newLienStatus: updated.lienStatus,
          lienNote: updated.lienNote,
          beneficiaryName: updated.beneficiaryName,
        }),
        ipAddress: req.ip || '127.0.0.1',
      },
    })

    res.json(formatFdrResponse(updated))
  } catch (err) {
    next(err)
  }
})

// POST /fdrs/:id/renewals
fdrsRouter.post('/:id/renewals', async (req: Request, res: Response, next: NextFunction) => {
  const id = param(req, 'id')
  createRenewalHandler(id, req.body, req, res, next)
})

// POST /fdrs/:id/release-requests
fdrsRouter.post('/:id/release-requests', async (req: Request, res: Response, next: NextFunction) => {
  const id = param(req, 'id')
  createReleaseRequestHandler(id, req.body, req, res, next)
})


