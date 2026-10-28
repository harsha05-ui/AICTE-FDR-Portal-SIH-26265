import crypto from 'crypto'
import pdfParse from 'pdf-parse'
import { createWorker } from 'tesseract.js'
import { prisma } from './prisma'

export interface ExtractedFields {
  depositorName?: string
  bankName?: string
  branchName?: string
  ifscCode?: string
  referenceNumber?: string
  depositAmount?: number
  amountWords?: string
  depositDate?: string // YYYY-MM-DD
  maturityDate?: string // YYYY-MM-DD
  lienWording?: string
  rawTextPreview?: string
}

const COMMON_BANKS = [
  'State Bank of India',
  'Punjab National Bank',
  'Canara Bank',
  'Bank of Baroda',
  'Union Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Indian Bank',
  'Central Bank of India',
  'Bank of India',
  'IndusInd Bank',
  'Yes Bank',
  'IDBI Bank',
]

/**
 * Convert Indian Rupee number words to integer
 * e.g. "One Crore", "Thirty Five Lakh", "Ten Lakh Fifty Thousand"
 */
export function wordsToIndianNumber(text: string): number | null {
  const clean = text.toLowerCase().replace(/[^a-z\s]/g, ' ')
  let total = 0

  const units: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90,
  }

  // Extract blocks like "X crore", "Y lakh", "Z thousand", "W hundred"
  const croreMatch = clean.match(/(\w+(?:\s+\w+)?)\s+crores?/i)
  if (croreMatch) {
    const val = parseSmallNumber(croreMatch[1], units)
    if (val > 0) total += val * 10000000
  }

  const lakhMatch = clean.match(/(\w+(?:\s+\w+)?)\s+lakhs?/i)
  if (lakhMatch) {
    const val = parseSmallNumber(lakhMatch[1], units)
    if (val > 0) total += val * 100000
  }

  const thousandMatch = clean.match(/(\w+(?:\s+\w+)?)\s+thousands?/i)
  if (thousandMatch) {
    const val = parseSmallNumber(thousandMatch[1], units)
    if (val > 0) total += val * 1000
  }

  const hundredMatch = clean.match(/(\w+)\s+hundred/i)
  if (hundredMatch) {
    const val = parseSmallNumber(hundredMatch[1], units)
    if (val > 0) total += val * 100
  }

  return total > 0 ? total : null
}

function parseSmallNumber(str: string, units: Record<string, number>): number {
  const words = str.trim().split(/\s+/)
  let sum = 0
  for (const w of words) {
    if (units[w]) {
      sum += units[w]
    }
  }
  return sum
}

/**
 * Standardize date strings to YYYY-MM-DD
 */
export function normalizeDate(dateStr?: string | null): string | null {
  if (!dateStr) return null
  try {
    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = dateStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/)
    if (dmy) {
      const day = dmy[1].padStart(2, '0')
      const month = dmy[2].padStart(2, '0')
      const year = dmy[3]
      return `${year}-${month}-${day}`
    }

    // Check YYYY-MM-DD
    const ymd = dateStr.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/)
    if (ymd) {
      const year = ymd[1]
      const month = ymd[2].padStart(2, '0')
      const day = ymd[3].padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
  } catch {
    return null
  }
  return null
}

/**
 * Parse text buffer to extract structured deposit fields
 */
export function parseFieldsFromText(text: string): ExtractedFields {
  const fields: ExtractedFields = {
    rawTextPreview: text.slice(0, 300).replace(/\s+/g, ' ').trim(),
  }

  // 1. IFSC Code: 4 letters, 0, 6 alphanumeric
  const ifscMatch = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/)
  if (ifscMatch) {
    fields.ifscCode = ifscMatch[1]
  }

  // 2. Bank Name
  for (const b of COMMON_BANKS) {
    const regex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i')
    if (regex.test(text)) {
      fields.bankName = b
      break
    }
  }
  if (!fields.bankName) {
    const bankRegexMatch = text.match(/(?:Bank(?:\s+Name)?|Commercial\s+Bank)[\s:]+([A-Za-z\s]+?)(?:\r?\n|,|\.|\s{2,})/i)
    if (bankRegexMatch && bankRegexMatch[1].trim().length > 3) {
      fields.bankName = bankRegexMatch[1].trim()
    }
  }

  // 3. Branch Name
  const branchMatch = text.match(/(?:Branch(?:\s+Name)?|Locality)[\s:]+([A-Za-z0-9\s,\.-]+?)(?:\r?\n|\.|\s{2,})/i)
  if (branchMatch && branchMatch[1].trim().length > 2) {
    fields.branchName = branchMatch[1].trim()
  }

  // 4. Reference Number / FDR Number
  const refMatch = text.match(/(?:FDR(?:\s*(?:No|Number|Receipt))?|Receipt\s*(?:No|Number)|Certificate\s*No|Deposit\s*Account\s*No)[\s:#\.-]+([A-Za-z0-9\/-]{4,35})/i)
  if (refMatch) {
    fields.referenceNumber = refMatch[1].trim()
  }

  // 5. Amount (Digits or Indian words)
  // First check currency symbols
  const amountMatch = text.match(/(?:Rs\.?|INR|₹|Amount|Sum\s+of)[\s:]*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/i)
  if (amountMatch) {
    const num = parseFloat(amountMatch[1].replace(/,/g, ''))
    if (!isNaN(num) && num > 0) {
      fields.depositAmount = num
    }
  }

  // Check words
  const wordsAmount = wordsToIndianNumber(text)
  if (wordsAmount && (!fields.depositAmount || fields.depositAmount < 1000)) {
    fields.depositAmount = wordsAmount
  }

  // 6. Depositor Name
  const depMatch = text.match(/(?:Depositor(?:\s*[\/&]\s*Institution(?:\s+Name)?)?|Depositor(?:\s+Name)?|In\s+the\s+name\s+of|Account\s+Holder|Name\s+of\s+Institution)[\s:]+([^\r\n;]+)/i)
  if (depMatch && depMatch[1].trim().length > 3) {
    const rawVal = depMatch[1].trim().replace(/^[\/\s]*(?:Institution\s*Name)?[\s:]*/i, '')
    if (rawVal.length > 3) {
      fields.depositorName = rawVal
    }
  }

  // 7. Dates (Deposit date and Maturity date)
  const issueMatch = text.match(/(?:Deposit\s+Date|Date\s+of\s+Issue|Issue\s+Date|Effective\s+Date|Dated)[\s:]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i)
  if (issueMatch) {
    const norm = normalizeDate(issueMatch[1])
    if (norm) fields.depositDate = norm
  }

  const matMatch = text.match(/(?:Maturity\s+Date|Date\s+of\s+Maturity|Due\s+Date|Valid\s+Upto|Expires\s+On)[\s:]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2})/i)
  if (matMatch) {
    const norm = normalizeDate(matMatch[1])
    if (norm) fields.maturityDate = norm
  }

  // 8. Lien wording
  if (
    /(?:lien|pledged|marked|hypothecated)/i.test(text) &&
    /(?:Member\s+Secretary|AICTE|Council)/i.test(text)
  ) {
    fields.lienWording = 'Marked in favour of Member Secretary, AICTE'
  }

  return fields
}

/**
 * Execute in-memory text extraction on a document buffer.
 * Never writes plaintext buffer to disk.
 * Uses PDF text layer first; falls back to OCR for scanned PDFs or images.
 */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  timeoutMs = 15000
): Promise<{
  method: 'TEXT_LAYER' | 'OCR'
  rawText: string
  extractedFields: ExtractedFields
  confidence: number
}> {
  const isPdf = mimeType === 'application/pdf' || (buffer[0] === 0x25 && buffer[1] === 0x50)
  const isImage =
    (mimeType === 'image/jpeg' || mimeType === 'image/png') &&
    ((buffer[0] === 0xff && buffer[1] === 0xd8) || (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47))

  if (isPdf) {
    try {
      let extractedText = ''
      const pdfModule: any = pdfParse
      if (pdfModule?.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer })
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF extraction timeout')), 1500)
        )
        const res = await Promise.race([parser.getText(), timeoutPromise])
        if (res?.text) extractedText = res.text
      } else {
        const pdfFn: any = pdfModule?.default || pdfModule
        if (typeof pdfFn === 'function') {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('PDF extraction timeout')), 1000)
          )
          const data = await Promise.race([pdfFn(buffer), timeoutPromise])
          if (data?.text) extractedText = data.text
        }
      }

      if (extractedText && extractedText.trim().length > 0) {
        const fields = parseFieldsFromText(extractedText)
        return {
          method: 'TEXT_LAYER',
          rawText: extractedText,
          extractedFields: fields,
          confidence: 0.98,
        }
      }
    } catch {
      // Fallback to text representation
    }
  }

  // 2. OCR fallback for verified image buffers
  if (isImage) {
    let worker: any = null
    try {
      worker = await createWorker('eng')
      const result = await worker.recognize(buffer)
      await worker.terminate()
      worker = null

      const ocrText = result?.data?.text || ''
      const fields = parseFieldsFromText(ocrText)

      return {
        method: 'OCR',
        rawText: ocrText,
        extractedFields: fields,
        confidence: (result?.data?.confidence || 75) / 100,
      }
    } catch {
      if (worker) {
        try {
          await worker.terminate()
        } catch {}
      }
    }
  }

  // 3. Fallback text representation
  const textRepr = buffer.toString('utf8', 0, Math.min(buffer.length, 50000)).replace(/[^\x20-\x7E\r\n]/g, ' ')
  const fields = parseFieldsFromText(textRepr)
  return {
    method: 'TEXT_LAYER',
    rawText: textRepr.slice(0, 1000),
    extractedFields: fields,
    confidence: 0.5,
  }
}

/**
 * Server-side worker to process extraction and update DocumentExtraction table.
 */
export async function processDocumentExtraction(
  documentId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const fileSha256 = crypto.createHash('sha256').update(buffer).digest('hex')

  try {
    const result = await extractDocumentText(buffer, mimeType)

    await prisma.documentExtraction.upsert({
      where: { documentId },
      update: {
        method: result.method,
        extractedFields: JSON.stringify(result.extractedFields),
        confidence: result.confidence,
        status: 'DONE',
        fileSha256,
        rawText: result.rawText.slice(0, 2000),
        extractedAt: new Date(),
        errorMessage: null,
      },
      create: {
        documentId,
        method: result.method,
        extractedFields: JSON.stringify(result.extractedFields),
        confidence: result.confidence,
        status: 'DONE',
        fileSha256,
        rawText: result.rawText.slice(0, 2000),
        extractedAt: new Date(),
      },
    })
  } catch (err: any) {
    await prisma.documentExtraction.upsert({
      where: { documentId },
      update: {
        method: 'TEXT_LAYER',
        extractedFields: JSON.stringify({}),
        confidence: 0,
        status: 'FAILED',
        fileSha256,
        errorMessage: err.message || 'Text extraction failed',
        extractedAt: new Date(),
      },
      create: {
        documentId,
        method: 'TEXT_LAYER',
        extractedFields: JSON.stringify({}),
        confidence: 0,
        status: 'FAILED',
        fileSha256,
        errorMessage: err.message || 'Text extraction failed',
        extractedAt: new Date(),
      },
    })
  }
}
