import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { ValidationError } from '../../lib/errors'
import { requireRole } from '../../middleware/auth'
import { getSetting } from '../../lib/settings'
import { parseAmountToDecimal } from '../../lib/params'

export const importRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const importRowSchema = z.object({
  institutionCode: z.string().trim().min(1, 'Institution code is required'),
  instrumentType: z.enum(['FDR', 'RTGS_DEPOSIT', 'BANK_GUARANTEE']).default('FDR'),
  bankName: z.string().trim().min(1, 'Bank name is required'),
  branchName: z.string().trim().optional(),
  referenceNumber: z.string().trim().min(1, 'Reference number is required'),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
  depositAmount: z.union([z.number(), z.string()]),
  interestRate: z.union([z.number(), z.string()]).optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  maturityDate: z.string().optional(),
  beneficiaryName: z.string().trim().optional(),
})

export type ImportRow = z.infer<typeof importRowSchema>

const importPayloadSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  rows: z.array(z.any()).min(1, 'At least one row is required for import'),
})

const HEADER_ALIASES: Record<string, string> = {
  fdrnumber: 'referenceNumber',
  referencenumber: 'referenceNumber',
  reference_no: 'referenceNumber',
  reference_number: 'referenceNumber',
  amount: 'depositAmount',
  depositamount: 'depositAmount',
  deposit_amount: 'depositAmount',
  institutioncode: 'institutionCode',
  institution_code: 'institutionCode',
  bankname: 'bankName',
  bank_name: 'bankName',
  branchname: 'branchName',
  branch_name: 'branchName',
  ifsccode: 'ifscCode',
  ifsc_code: 'ifscCode',
  accountnumber: 'accountNumber',
  account_number: 'accountNumber',
  interestrate: 'interestRate',
  interest_rate: 'interestRate',
  issuedate: 'issueDate',
  issue_date: 'issueDate',
  maturitydate: 'maturityDate',
  maturity_date: 'maturityDate',
  instrumenttype: 'instrumentType',
  instrument_type: 'instrumentType',
}

// Helper to parse CSV text into row objects if client sends raw CSV
export function parseCsvText(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
  const headers = rawHeaders.map((h) => {
    const clean = h.toLowerCase().replace(/[\s_-]/g, '')
    return HEADER_ALIASES[clean] || h
  })
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : ''
    }
    result.push(row)
  }

  return result
}

// POST /import/instruments (Admin only)
importRouter.post(
  '/instruments',
  requireRole('ADMIN'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isDryRunQuery = req.query.dryRun === 'true' || req.query.dryRun === '1'

      let rawRows: any[] = []
      let dryRun = isDryRunQuery

      if (req.file) {
        const fileContent = req.file.buffer.toString('utf-8')
        rawRows = parseCsvText(fileContent)
      } else if (typeof req.body === 'string' || (req.headers['content-type'] && req.headers['content-type'].includes('text/csv'))) {
        rawRows = parseCsvText(req.body)
      } else if (req.body && Array.isArray(req.body.rows)) {
        const parsedBody = importPayloadSchema.parse(req.body)
        rawRows = parsedBody.rows
        dryRun = dryRun || parsedBody.dryRun
      } else if (Array.isArray(req.body)) {
        rawRows = req.body
      } else {
        throw new ValidationError('Invalid import format. Expected { dryRun?: boolean, rows: [...] } or CSV array.')
      }

      const defaultRequiredFields: Record<string, string[]> = {
        FDR: ['referenceNumber', 'bankName', 'branchName', 'issueDate', 'maturityDate', 'depositAmount'],
        RTGS_DEPOSIT: ['referenceNumber', 'bankName', 'issueDate', 'depositAmount'],
        BANK_GUARANTEE: ['referenceNumber', 'bankName', 'issueDate', 'maturityDate', 'depositAmount'],
      }

      const requiredFieldsMap = await getSetting<Record<string, string[]>>(
        'instruments.required_fields',
        defaultRequiredFields
      )

      const rowErrors: Array<{ row: number; referenceNumber?: string; bankName?: string; error: string }> = []
      const validRowsToInsert: Array<{ rowData: ImportRow; institutionId: string }> = []
      const seenInBatch = new Set<string>()

      for (let idx = 0; idx < rawRows.length; idx++) {
        const rowNum = idx + 1
        const raw = rawRows[idx]

        // 1. Zod schema validation
        const parsed = importRowSchema.safeParse(raw)
        if (!parsed.success) {
          const errs = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
          rowErrors.push({ row: rowNum, error: errs })
          continue
        }

        const data = parsed.data
        const reqFields = (requiredFieldsMap && requiredFieldsMap[data.instrumentType]) || defaultRequiredFields.FDR

        // 2. Check type-specific required fields
        let missingReq = false
        for (const field of reqFields) {
          const v = (data as any)[field]
          if (v === undefined || v === null || v === '') {
            rowErrors.push({
              row: rowNum,
              referenceNumber: data.referenceNumber,
              bankName: data.bankName,
              error: `Missing required field '${field}' for instrument type ${data.instrumentType}`,
            })
            missingReq = true
            break
          }
        }
        if (missingReq) continue

        // 3. Amount and date validation
        const amountNum = Number(data.depositAmount)
        if (isNaN(amountNum) || amountNum <= 0) {
          rowErrors.push({
            row: rowNum,
            referenceNumber: data.referenceNumber,
            error: 'Deposit amount must be a positive number',
          })
          continue
        }

        const issueDate = new Date(data.issueDate)
        if (isNaN(issueDate.getTime())) {
          rowErrors.push({
            row: rowNum,
            referenceNumber: data.referenceNumber,
            error: 'Invalid issue date format',
          })
          continue
        }

        if (data.instrumentType !== 'RTGS_DEPOSIT') {
          if (!data.maturityDate) {
            rowErrors.push({
              row: rowNum,
              referenceNumber: data.referenceNumber,
              error: 'Maturity date is required for FDR and BANK_GUARANTEE',
            })
            continue
          }
          const maturityDate = new Date(data.maturityDate)
          if (isNaN(maturityDate.getTime())) {
            rowErrors.push({
              row: rowNum,
              referenceNumber: data.referenceNumber,
              error: 'Invalid maturity date format',
            })
            continue
          }
          if (maturityDate <= issueDate) {
            rowErrors.push({
              row: rowNum,
              referenceNumber: data.referenceNumber,
              error: 'Maturity date must be strictly after issue date',
            })
            continue
          }
        }

        // 4. Batch duplicate check
        const batchKey = `${data.bankName.toLowerCase().trim()}::${data.referenceNumber.toLowerCase().trim()}`
        if (seenInBatch.has(batchKey)) {
          rowErrors.push({
            row: rowNum,
            referenceNumber: data.referenceNumber,
            bankName: data.bankName,
            error: 'Duplicate bank and reference number within this import batch',
          })
          continue
        }
        seenInBatch.add(batchKey)

        // 5. Database duplicate check (bankName + referenceNumber)
        const existingFdr = await prisma.fDR.findFirst({
          where: {
            bankName: data.bankName,
            referenceNumber: data.referenceNumber,
          },
        })
        if (existingFdr) {
          rowErrors.push({
            row: rowNum,
            referenceNumber: data.referenceNumber,
            bankName: data.bankName,
            error: `Instrument with bank '${data.bankName}' and reference '${data.referenceNumber}' already exists in registry`,
          })
          continue
        }

        // 6. Match institution by permanent code or id
        const inst = await prisma.institution.findFirst({
          where: {
            OR: [
              { institutionCode: data.institutionCode },
              { id: data.institutionCode },
            ],
          },
        })
        if (!inst) {
          rowErrors.push({
            row: rowNum,
            referenceNumber: data.referenceNumber,
            error: `Institution with code '${data.institutionCode}' not found in registry`,
          })
          continue
        }

        validRowsToInsert.push({ rowData: data, institutionId: inst.id })
      }

      // If dryRun, do not insert anything
      if (dryRun) {
        return res.json({
          dryRun: true,
          totalRows: rawRows.length,
          validRows: validRowsToInsert.length,
          invalidRows: rowErrors.length,
          errors: rowErrors,
          message: `Dry run completed. ${validRowsToInsert.length} valid row(s), ${rowErrors.length} invalid row(s). No records created.`,
        })
      }

      // If real run and there are validation errors, return row errors without partial corruption if desired
      if (rowErrors.length > 0 && validRowsToInsert.length === 0) {
        return res.status(400).json({
          dryRun: false,
          totalRows: rawRows.length,
          validRows: 0,
          invalidRows: rowErrors.length,
          errors: rowErrors,
          message: 'All rows contained errors. Import aborted.',
        })
      }

      // Insert valid rows in transaction
      const inserted = await prisma.$transaction(async (tx) => {
        const records = []
        for (const item of validRowsToInsert) {
          const d = item.rowData
          const rec = await tx.fDR.create({
            data: {
              institutionId: item.institutionId,
              referenceNumber: d.referenceNumber,
              bankName: d.bankName,
              branchName: d.branchName || 'Main Branch',
              accountNumber: d.accountNumber || null,
              ifscCode: d.ifscCode || null,
              depositAmount: parseAmountToDecimal(d.depositAmount),
              interestRate: d.interestRate ? parseAmountToDecimal(d.interestRate) : 7.0,
              instrumentType: d.instrumentType,
              issueDate: new Date(d.issueDate),
              maturityDate: d.maturityDate ? new Date(d.maturityDate) : new Date(new Date(d.issueDate).getTime() + 5 * 365 * 24 * 3600 * 1000),
              verificationStatus: 'SUBMITTED',
              lifecycleStatus: 'ACTIVE',
              riskLevel: 'LOW',
              flags: '[]',
              trustLevel: 'SUBMITTED',
              trustSimulated: false,
              lienStatus: 'NOT_RECORDED',
              beneficiaryName: d.beneficiaryName || 'Member Secretary, AICTE',
              createdBy: req.user!.id,
            },
          })
          records.push(rec)
        }
        return records
      })

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          action: 'IMPORT_INSTRUMENTS',
          entityType: 'FDR',
          entityId: 'BATCH_IMPORT',
          changeSummary: `Admin bulk imported ${inserted.length} statutory instruments with trustLevel=SUBMITTED (source: IMPORT).`,
          metadata: JSON.stringify({
            importedCount: inserted.length,
            failedCount: rowErrors.length,
            errors: rowErrors,
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      })

      res.status(201).json({
        dryRun: false,
        totalRows: rawRows.length,
        importedCount: inserted.length,
        failedCount: rowErrors.length,
        errors: rowErrors,
        message: `Successfully imported ${inserted.length} instrument(s) as SUBMITTED trust.`,
      })
    } catch (err) {
      next(err)
    }
  }
)
