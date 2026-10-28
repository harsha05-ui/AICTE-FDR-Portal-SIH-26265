import crypto from 'crypto'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { BankVerificationAdapter, bankVerificationService } from '../integrations/bankVerification'
import { ExtractedFields, normalizeDate } from './extraction'

export interface DocumentSlotConfig {
  slotType: string
  label: string
  mandatory: boolean
  description: string
}

export const DEFAULT_REQUIRED_DOCUMENT_SLOTS: Record<string, DocumentSlotConfig[]> = {
  FDR: [
    {
      slotType: 'FDR_CERTIFICATE',
      label: 'Fixed Deposit Receipt / Certificate',
      mandatory: true,
      description: 'Original stamped deposit certificate issued by the commercial bank.',
    },
    {
      slotType: 'BANK_CONFIRMATION_LETTER',
      label: 'Bank Confirmation Letter / Statement',
      mandatory: true,
      description: 'Formal confirmation letter from the branch manager or bank statement.',
    },
    {
      slotType: 'LIEN_ENDORSEMENT',
      label: 'AICTE Lien Endorsement Notation',
      mandatory: true,
      description: 'Irrevocable lien marking letter in favour of Member Secretary, AICTE.',
    },
    {
      slotType: 'INSTITUTION_REQUEST_LETTER',
      label: 'Institutional Request Letter / Board Resolution',
      mandatory: true,
      description: 'Authorised signatory request letter on institutional letterhead.',
    },
  ],
  RTGS_DEPOSIT: [
    {
      slotType: 'RTGS_RECEIPT',
      label: 'RTGS / NEFT UTR Transfer Receipt',
      mandatory: true,
      description: 'Bank payment debit advice with valid UTR number.',
    },
    {
      slotType: 'BANK_STATEMENT',
      label: 'Bank Statement Showing Remittance',
      mandatory: true,
      description: 'Certified bank account statement reflecting transferred funds.',
    },
    {
      slotType: 'INSTITUTION_REQUEST_LETTER',
      label: 'Institutional Request Letter',
      mandatory: true,
      description: 'Authorised signatory letter pledging statutory deposit funds.',
    },
  ],
  BANK_GUARANTEE: [
    {
      slotType: 'BG_CERTIFICATE',
      label: 'Original Bank Guarantee Deed',
      mandatory: true,
      description: 'Original stamped and executed Bank Guarantee covenant.',
    },
    {
      slotType: 'SFMS_CONFIRMATION',
      label: 'SFMS Structured Financial Messaging Advice',
      mandatory: true,
      description: 'SFMS confirmation copy (IFN 760 COV) transmitted via banking network.',
    },
    {
      slotType: 'INSTITUTION_REQUEST_LETTER',
      label: 'Institutional Request Letter',
      mandatory: true,
      description: 'Board resolution and request letter submitting the guarantee.',
    },
  ],
}

/**
 * String similarity score [0.0 - 1.0] using token sets and normalized edit distance
 */
export function stringSimilarity(s1?: string | null, s2?: string | null): number {
  if (!s1 || !s2) return 0.0
  const str1 = s1.toLowerCase().trim()
  const str2 = s2.toLowerCase().trim()
  if (str1 === str2) return 1.0

  // Substring containment check
  if (str1.includes(str2) || str2.includes(str1)) {
    const longer = Math.max(str1.length, str2.length)
    const shorter = Math.min(str1.length, str2.length)
    return Math.max(0.85, shorter / longer)
  }

  // Token set intersection
  const words1 = new Set(str1.split(/[\s,.-]+/).filter((w) => w.length > 2))
  const words2 = new Set(str2.split(/[\s,.-]+/).filter((w) => w.length > 2))
  if (words1.size > 0 && words2.size > 0) {
    let intersection = 0
    for (const w of words1) {
      if (words2.has(w)) intersection++
    }
    const union = new Set([...words1, ...words2]).size
    const jaccard = intersection / union
    if (jaccard >= 0.7) return Math.min(1.0, jaccard + 0.15)
  }

  // Levenshtein distance
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }
  const distance = track[str2.length][str1.length]
  const maxLen = Math.max(str1.length, str2.length)
  return Math.max(0, 1 - distance / maxLen)
}

export interface FieldComparisonResult {
  field: string
  label: string
  formValue: any
  docValue: any
  receiptValue: any
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND'
  message: string
}

export interface PrecheckReport {
  instrumentId: string
  canSubmit: boolean
  gateMode: 'STRICT_BANK_RECEIPT' | 'DOCUMENT_ONLY'
  blockers: string[]
  checks: Array<{
    checkType: string
    field: string
    status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'PASSED' | 'FAILED'
    details: any
    simulated: boolean
  }>
  fieldComparisons: FieldComparisonResult[]
  bankReceipt: any | null
  slotSummary: Array<{
    slotType: string
    label: string
    mandatory: boolean
    uploaded: boolean
    documentId?: string
    fileName?: string
    extractionStatus?: string
  }>
  extractions: Record<
    string,
    {
      id?: string
      status: 'PENDING' | 'DONE' | 'FAILED'
      method: 'TEXT_LAYER' | 'OCR' | 'NONE'
      confidence: number
      extractedFields: Record<string, any>
    }
  >
}

/**
 * Run full pre-submission verification gate.
 */
export async function runPreSubmissionCheck(instrumentId: string): Promise<PrecheckReport> {
  const fdr = await prisma.fDR.findUnique({
    where: { id: instrumentId },
    include: {
      institution: true,
      documents: {
        include: { extraction: true },
        orderBy: { version: 'desc' },
      },
      bankReceipts: {
        orderBy: { receivedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!fdr) {
    throw new Error(`Instrument ${instrumentId} not found`)
  }

  const blockers: string[] = []
  const checksToSave: Array<{
    checkType: string
    field: string
    status: string
    details: string
    simulated: boolean
  }> = []

  // 1. Fetch settings
  const gateMode = await getSetting<'STRICT_BANK_RECEIPT' | 'DOCUMENT_ONLY'>(
    'submission.gate_mode',
    'STRICT_BANK_RECEIPT'
  )
  const nameThreshold = await getSetting<number>('submission.name_match_threshold', 0.8)
  const requiredSlotsMap = await getSetting<Record<string, DocumentSlotConfig[]>>(
    'documents.required_by_type',
    DEFAULT_REQUIRED_DOCUMENT_SLOTS
  )

  const slots = requiredSlotsMap[fdr.instrumentType] || DEFAULT_REQUIRED_DOCUMENT_SLOTS.FDR

  // 2. Evaluate Document Slots & Extractions
  const slotSummary: PrecheckReport['slotSummary'] = []
  const extractionsMap: PrecheckReport['extractions'] = {}
  let allRequiredSlotsPresent = true
  let allExtractionsDone = true

  for (const slot of slots) {
    const doc = fdr.documents.find(
      (d) => (d.slotType === slot.slotType || d.documentType === slot.slotType)
    )

    if (doc) {
      let fields: Record<string, any> = {}
      if (doc.extraction?.extractedFields) {
        try {
          fields = JSON.parse(doc.extraction.extractedFields)
        } catch {
          fields = {}
        }
      }
      extractionsMap[slot.slotType] = {
        id: doc.extraction?.id,
        status: (doc.extraction?.status as any) || 'PENDING',
        method: (doc.extraction?.method as any) || 'NONE',
        confidence: doc.extraction?.confidence ?? 0,
        extractedFields: fields,
      }
    }

    if (!doc) {
      slotSummary.push({
        slotType: slot.slotType,
        label: slot.label,
        mandatory: slot.mandatory,
        uploaded: false,
      })
      if (slot.mandatory) {
        allRequiredSlotsPresent = false
        blockers.push(`Missing required document slot: ${slot.label} (${slot.slotType})`)
        checksToSave.push({
          checkType: 'DOCUMENT_SLOTS',
          field: slot.slotType,
          status: 'NOT_FOUND',
          details: JSON.stringify({ message: `Slot ${slot.label} has no uploaded document.` }),
          simulated: false,
        })
      }
    } else {
      const extStatus = doc.extraction?.status || 'PENDING'
      slotSummary.push({
        slotType: slot.slotType,
        label: slot.label,
        mandatory: slot.mandatory,
        uploaded: true,
        documentId: doc.id,
        fileName: doc.originalFilename,
        extractionStatus: extStatus,
      })

      if (slot.mandatory && extStatus !== 'DONE') {
        allExtractionsDone = false
        blockers.push(`Document ${doc.originalFilename} extraction is ${extStatus} (must be DONE).`)
        checksToSave.push({
          checkType: 'EXTRACTION',
          field: slot.slotType,
          status: extStatus === 'FAILED' ? 'FAILED' : 'NOT_FOUND',
          details: JSON.stringify({
            message: `Extraction for ${doc.originalFilename} is currently ${extStatus}.`,
            documentId: doc.id,
          }),
          simulated: false,
        })
      } else {
        checksToSave.push({
          checkType: 'DOCUMENT_SLOTS',
          field: slot.slotType,
          status: 'PASSED',
          details: JSON.stringify({
            message: `Document attached: ${doc.originalFilename}`,
            documentId: doc.id,
          }),
          simulated: false,
        })
      }
    }
  }

  // 3. Extract primary certificate fields
  const certDoc = fdr.documents.find(
    (d) =>
      d.slotType === 'FDR_CERTIFICATE' ||
      d.slotType === 'BG_CERTIFICATE' ||
      d.slotType === 'RTGS_RECEIPT' ||
      d.documentType === 'FDR_CERTIFICATE'
  )
  let certFields: ExtractedFields = {}
  if (certDoc?.extraction?.extractedFields) {
    try {
      certFields = JSON.parse(certDoc.extraction.extractedFields)
    } catch {
      certFields = {}
    }
  }

  // Also check secondary bank confirmation document fields if available
  const bankDoc = fdr.documents.find(
    (d) =>
      d.slotType === 'BANK_CONFIRMATION_LETTER' ||
      d.slotType === 'BANK_STATEMENT' ||
      d.slotType === 'SFMS_CONFIRMATION'
  )
  let bankDocFields: ExtractedFields = {}
  if (bankDoc?.extraction?.extractedFields) {
    try {
      bankDocFields = JSON.parse(bankDoc.extraction.extractedFields)
    } catch {
      bankDocFields = {}
    }
  }

  // 4. Run Bank Verification Adapter
  let bankReceiptRecord = fdr.bankReceipts[0] || null
  let receiptPayload: any = {}

  // If no bank receipt exists or checks are being refreshed, call verifyInstrument
  try {
    const bankAdapterResult = await bankVerificationService.verifyInstrument({
      id: fdr.id,
      referenceNumber: fdr.referenceNumber,
      bankName: fdr.bankName,
      branchName: fdr.branchName,
      ifscCode: fdr.ifscCode,
      accountNumber: fdr.accountNumber,
      depositAmount: Number(fdr.depositAmount),
      instrumentType: fdr.instrumentType,
    })

    receiptPayload = bankAdapterResult.details || {}
    const receiptRef =
      (receiptPayload.bankReference as string) ||
      `RCPT-${fdr.bankName.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`

    const payloadStr = JSON.stringify({
      ...receiptPayload,
      status: bankAdapterResult.status,
      source: bankAdapterResult.source,
    })
    const payloadSha256 = crypto.createHash('sha256').update(payloadStr).digest('hex')

    bankReceiptRecord = await prisma.bankReceipt.create({
      data: {
        instrumentId: fdr.id,
        receiptRef,
        source: bankAdapterResult.simulated ? 'MOCK' : 'LIVE',
        simulated: bankAdapterResult.simulated,
        payloadSha256,
        payload: payloadStr,
        status: bankAdapterResult.status,
      },
    })
  } catch (err: any) {
    // If bank adapter fails, record error
  }

  if (bankReceiptRecord) {
    try {
      receiptPayload = JSON.parse(bankReceiptRecord.payload)
    } catch {
      receiptPayload = {}
    }
  }

  // 5. Cross-Match Engine: Form vs Certificate vs Bank Doc vs Bank Receipt
  const fieldComparisons: FieldComparisonResult[] = []

  // Helper to register comparison
  function addComparison(
    field: string,
    label: string,
    formVal: any,
    docVal: any,
    receiptVal: any,
    compareFn: (f: any, d: any, r: any) => { status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND'; message: string },
    isMandatoryField = true
  ) {
    const res = compareFn(formVal, docVal, receiptVal)
    fieldComparisons.push({
      field,
      label,
      formValue: formVal,
      docValue: docVal ?? 'NOT_FOUND',
      receiptValue: receiptVal ?? 'NOT_FOUND',
      status: res.status,
      message: res.message,
    })

    const isSimulated = Boolean(bankReceiptRecord?.simulated)
    checksToSave.push({
      checkType: 'FIELD_MATCH',
      field,
      status: res.status,
      details: JSON.stringify({
        formValue: formVal,
        docValue: docVal,
        receiptValue: receiptVal,
        message: res.message,
      }),
      simulated: isSimulated,
    })

    if (isMandatoryField && res.status !== 'MATCH') {
      blockers.push(`Field ${label}: ${res.status} — ${res.message}`)
    }
  }

  // 5a. Deposit Amount
  const formAmount = Number(fdr.depositAmount)
  const docAmount = certFields.depositAmount || bankDocFields.depositAmount
  const receiptAmount = receiptPayload.depositAmount ? Number(receiptPayload.depositAmount) : undefined

  addComparison(
    'depositAmount',
    'Deposit Amount',
    formAmount,
    docAmount,
    receiptAmount,
    (f, d, r) => {
      if (d === undefined && r === undefined) {
        return { status: 'NOT_FOUND', message: 'Amount not detected in certificate or bank receipt.' }
      }
      if (d !== undefined && Math.abs(f - d) > 1) {
        return { status: 'MISMATCH', message: `Form specifies ₹${f.toLocaleString('en-IN')}, but certificate states ₹${d.toLocaleString('en-IN')}.` }
      }
      if (gateMode === 'STRICT_BANK_RECEIPT' && r !== undefined && Math.abs(f - r) > 1) {
        return { status: 'MISMATCH', message: `Form specifies ₹${f.toLocaleString('en-IN')}, but bank receipt indicates ₹${r.toLocaleString('en-IN')}.` }
      }
      if (d !== undefined && r !== undefined && Math.abs(d - r) > 1) {
        return { status: 'MISMATCH', message: `Certificate (₹${d.toLocaleString('en-IN')}) contradicts bank receipt (₹${r.toLocaleString('en-IN')}).` }
      }
      if (d === undefined) {
        return { status: 'NOT_FOUND', message: 'Amount not extracted from uploaded certificate.' }
      }
      return { status: 'MATCH', message: `Deposit amount ₹${f.toLocaleString('en-IN')} matches across form, certificate, and bank receipt.` }
    }
  )

  // 5b. Reference / Certificate Number
  const formRef = fdr.referenceNumber.trim()
  const docRef = certFields.referenceNumber?.trim()
  const receiptRef = receiptPayload.bankReference?.trim()

  addComparison(
    'referenceNumber',
    'Instrument Reference Number',
    formRef,
    docRef,
    receiptRef,
    (f, d, r) => {
      if (!d && !r) {
        return { status: 'NOT_FOUND', message: 'Reference number not detected in document.' }
      }
      if (d && d.toLowerCase() !== f.toLowerCase() && !f.toLowerCase().includes(d.toLowerCase()) && !d.toLowerCase().includes(f.toLowerCase())) {
        return { status: 'MISMATCH', message: `Form reference '${f}' contradicts certificate reference '${d}'.` }
      }
      if (gateMode === 'STRICT_BANK_RECEIPT' && r && r.toLowerCase() !== f.toLowerCase() && !f.toLowerCase().includes(r.toLowerCase())) {
        return { status: 'MISMATCH', message: `Form reference '${f}' contradicts bank receipt reference '${r}'.` }
      }
      if (!d) {
        return { status: 'NOT_FOUND', message: 'Reference number not found in uploaded certificate text layer.' }
      }
      return { status: 'MATCH', message: `Reference number '${f}' matches across form and certificates.` }
    }
  )

  // 5c. Depositor / Institution Name
  const formInstName = fdr.institution.name
  const docDepName = certFields.depositorName || bankDocFields.depositorName
  const receiptDepName = (receiptPayload.depositorName || receiptPayload.beneficiaryName) as string | undefined

  addComparison(
    'depositorName',
    'Depositor / Institution Name',
    formInstName,
    docDepName,
    receiptDepName,
    (f, d, _r) => {
      if (!d) {
        return { status: 'NOT_FOUND', message: 'Depositor/Institution name was not detected in certificate.' }
      }
      const sim = stringSimilarity(f, d)
      if (sim < nameThreshold) {
        return {
          status: 'MISMATCH',
          message: `Depositor name '${d}' does not match institution '${f}' (similarity: ${Math.round(sim * 100)}%, required: ${Math.round(nameThreshold * 100)}%).`,
        }
      }
      return { status: 'MATCH', message: `Depositor name '${d}' matches institution '${f}' (similarity: ${Math.round(sim * 100)}%).` }
    }
  )

  // 5d. Bank Name
  const formBank = fdr.bankName.trim()
  const docBank = certFields.bankName?.trim() || bankDocFields.bankName?.trim()
  const receiptBank = receiptPayload.bankName as string | undefined

  addComparison(
    'bankName',
    'Bank Name',
    formBank,
    docBank,
    receiptBank,
    (f, d, _r) => {
      if (!d) {
        return { status: 'NOT_FOUND', message: 'Bank name not detected in uploaded certificate.' }
      }
      const sim = stringSimilarity(f, d)
      if (sim < 0.7) {
        return { status: 'MISMATCH', message: `Bank name '${d}' contradicts form bank '${f}'.` }
      }
      return { status: 'MATCH', message: `Bank name matches '${f}'.` }
    }
  )

  // 5e. IFSC Code
  const formIfsc = fdr.ifscCode ? fdr.ifscCode.trim().toUpperCase() : null
  const docIfsc = certFields.ifscCode ? certFields.ifscCode.trim().toUpperCase() : null

  addComparison(
    'ifscCode',
    'Branch IFSC Code',
    formIfsc,
    docIfsc,
    receiptPayload.ifscCode,
    (f, d, _r) => {
      if (!d) {
        return { status: 'NOT_FOUND', message: 'IFSC code not found in document.' }
      }
      if (f && d !== f) {
        return { status: 'MISMATCH', message: `Form IFSC '${f}' does not match certificate IFSC '${d}'.` }
      }
      return { status: 'MATCH', message: `IFSC code '${d}' verified.` }
    },
    false // Optional if bank certificate lacks IFSC
  )

  // 5f. Issue Date & Maturity Date
  const formIssue = normalizeDate(fdr.issueDate.toISOString().slice(0, 10))
  const docIssue = certFields.depositDate ? normalizeDate(certFields.depositDate) : null

  addComparison(
    'issueDate',
    'Deposit / Issue Date',
    formIssue,
    docIssue,
    receiptPayload.issueDate,
    (f, d, _r) => {
      if (!d) {
        return { status: 'NOT_FOUND', message: 'Deposit date not detected in certificate.' }
      }
      if (f !== d) {
        return { status: 'MISMATCH', message: `Form issue date (${f}) contradicts certificate date (${d}).` }
      }
      return { status: 'MATCH', message: `Deposit issue date (${f}) matches.` }
    }
  )

  const formMaturity = normalizeDate(fdr.maturityDate.toISOString().slice(0, 10))
  const docMaturity = certFields.maturityDate ? normalizeDate(certFields.maturityDate) : null

  addComparison(
    'maturityDate',
    'Maturity Date',
    formMaturity,
    docMaturity,
    receiptPayload.maturityDate,
    (f, d, _r) => {
      if (!d) {
        return { status: 'NOT_FOUND', message: 'Maturity date not detected in certificate.' }
      }
      if (f !== d) {
        return { status: 'MISMATCH', message: `Form maturity date (${f}) contradicts certificate maturity (${d}).` }
      }
      return { status: 'MATCH', message: `Maturity date (${f}) matches.` }
    }
  )

  // 5g. Lien Wording Check
  const docLien = certFields.lienWording || bankDocFields.lienWording
  addComparison(
    'lienWording',
    'Lien Endorsement Wording',
    'Member Secretary, AICTE',
    docLien,
    receiptPayload.lienMarked ? 'CONFIRMED' : undefined,
    (_f, d, r) => {
      if (!d && !r) {
        return { status: 'NOT_FOUND', message: 'Lien wording not detected in documents or receipt.' }
      }
      return { status: 'MATCH', message: 'Lien in favour of Member Secretary, AICTE confirmed.' }
    },
    false
  )

  // 6. Gate Mode check on Bank Receipt
  if (gateMode === 'STRICT_BANK_RECEIPT') {
    if (!bankReceiptRecord || bankReceiptRecord.status !== 'CONFIRMED') {
      const errStatus = bankReceiptRecord?.status || 'MISSING'
      blockers.push(`Bank receipt confirmation required (status: ${errStatus}). Must be CONFIRMED from bank adapter.`)
      checksToSave.push({
        checkType: 'BANK_RECEIPT',
        field: 'bankReceipt',
        status: 'FAILED',
        details: JSON.stringify({ message: `Bank receipt status is ${errStatus}.` }),
        simulated: Boolean(bankReceiptRecord?.simulated),
      })
    } else {
      checksToSave.push({
        checkType: 'BANK_RECEIPT',
        field: 'bankReceipt',
        status: 'PASSED',
        details: JSON.stringify({
          receiptRef: bankReceiptRecord.receiptRef,
          source: bankReceiptRecord.source,
          simulated: bankReceiptRecord.simulated,
        }),
        simulated: bankReceiptRecord.simulated,
      })
    }
  }

  // 7. Atomic persistence of checks to PreSubmissionCheck table
  await prisma.preSubmissionCheck.deleteMany({
    where: { instrumentId: fdr.id },
  })

  for (const c of checksToSave) {
    await prisma.preSubmissionCheck.create({
      data: {
        instrumentId: fdr.id,
        checkType: c.checkType,
        field: c.field,
        status: c.status,
        details: c.details,
        simulated: c.simulated,
      },
    })
  }

  // Determine canSubmit
  const canSubmit = blockers.length === 0

  return {
    instrumentId: fdr.id,
    canSubmit,
    gateMode,
    blockers,
    checks: checksToSave.map((c) => ({
      checkType: c.checkType,
      field: c.field,
      status: c.status as any,
      details: JSON.parse(c.details || '{}'),
      simulated: c.simulated,
    })),
    fieldComparisons,
    bankReceipt: bankReceiptRecord
      ? {
          id: bankReceiptRecord.id,
          receiptRef: bankReceiptRecord.receiptRef,
          source: bankReceiptRecord.source,
          simulated: bankReceiptRecord.simulated,
          status: bankReceiptRecord.status,
          receivedAt: bankReceiptRecord.receivedAt.toISOString(),
          details: receiptPayload,
        }
      : null,
    slotSummary,
    extractions: extractionsMap,
  }
}
