import { prisma } from './prisma'
import { RiskLevel } from './types'
import { getSetting } from './settings'

const DEFAULT_REQUIRED_FIELDS: Record<string, string[]> = {
  FDR: ['referenceNumber', 'bankName', 'branchName', 'issueDate', 'maturityDate', 'depositAmount'],
  RTGS_DEPOSIT: ['referenceNumber', 'bankName', 'issueDate', 'depositAmount'],
  BANK_GUARANTEE: ['referenceNumber', 'bankName', 'issueDate', 'maturityDate', 'depositAmount'],
}

const DEFAULT_DEPOSIT_CATEGORIES: Record<string, { requiredAmount: number; minTenureMonths: number }> = {
  ENGINEERING: { requiredAmount: 3500000, minTenureMonths: 60 },
  MANAGEMENT: { requiredAmount: 1500000, minTenureMonths: 60 },
  PHARMACY: { requiredAmount: 1500000, minTenureMonths: 60 },
  ARCHITECTURE: { requiredAmount: 1500000, minTenureMonths: 60 },
  DEFAULT: { requiredAmount: 1000000, minTenureMonths: 60 },
}

export interface DiscrepancyRuleResult {
  flags: string[]
  riskLevel: RiskLevel
}

export async function runDiscrepancyRules(fdrId: string): Promise<DiscrepancyRuleResult> {
  const fdr = await prisma.fDR.findUnique({
    where: { id: fdrId },
    include: {
      documents: true,
      institution: true,
      verifications: { orderBy: { verifiedAt: 'desc' }, take: 1 },
    },
  })

  if (!fdr) {
    return { flags: [], riskLevel: 'LOW' }
  }

  const flags: string[] = []

  // Check required fields based on instrumentType from settings
  const requiredFieldsMap = await getSetting<Record<string, string[]>>(
    'instruments.required_fields',
    DEFAULT_REQUIRED_FIELDS
  )
  const reqFields = (requiredFieldsMap && requiredFieldsMap[fdr.instrumentType]) || DEFAULT_REQUIRED_FIELDS.FDR

  for (const field of reqFields) {
    const val = (fdr as any)[field]
    if (val === undefined || val === null || val === '') {
      flags.push(`MISSING_REQUIRED_FIELD_${field.toUpperCase()}`)
    }
  }

  // Instrument specific checks
  if (fdr.instrumentType !== 'RTGS_DEPOSIT') {
    // Rule: Maturity before or on issue date
    if (fdr.maturityDate && fdr.issueDate && new Date(fdr.maturityDate) <= new Date(fdr.issueDate)) {
      flags.push('MATURITY_BEFORE_ISSUE_DATE')
    }

    // Rule: Maturity already passed
    if (fdr.maturityDate && new Date(fdr.maturityDate) < new Date()) {
      flags.push('MATURITY_DATE_ALREADY_PASSED')
    }
  }

  // Rule: Non-positive amount
  if (Number(fdr.depositAmount) <= 0) {
    flags.push('INVALID_AMOUNT_NON_POSITIVE')
  }

  // Rule: Same reference number under another bank
  const duplicateUnderOtherBank = await prisma.fDR.findFirst({
    where: {
      referenceNumber: fdr.referenceNumber,
      bankName: { not: fdr.bankName },
      id: { not: fdr.id },
    },
  })
  if (duplicateUnderOtherBank) {
    flags.push('DUPLICATE_REFERENCE_ACROSS_BANKS')
  }

  // Rule: No documents attached
  if (!fdr.documents || fdr.documents.length === 0) {
    flags.push('NO_DOCUMENTS_ATTACHED')
  }

  // === R13: Extra Discrepancy Rules ===

  // 1. Depositor name vs institution name mismatch
  // Check if depositor name is present in verification details, fdr metadata, or custom field
  const latestVerification = fdr.verifications[0]
  let depositorName: string | undefined
  if (latestVerification?.remarks && latestVerification.remarks.includes('depositor=')) {
    const match = latestVerification.remarks.match(/depositor=([^;]+)/)
    if (match) depositorName = match[1].trim()
  } else if ((fdr as any).depositorName) {
    depositorName = String((fdr as any).depositorName).trim()
  }

  if (depositorName && fdr.institution?.name) {
    const cleanDep = depositorName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const cleanInst = fdr.institution.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!cleanInst.includes(cleanDep) && !cleanDep.includes(cleanInst)) {
      flags.push('DEPOSITOR_NAME_MISMATCH')
    }
  }

  // 2. Category requirement checks (Amount and Tenure)
  const categoriesConfig = await getSetting<Record<string, { requiredAmount: number; minTenureMonths: number }>>(
    'deposit.categories',
    DEFAULT_DEPOSIT_CATEGORIES
  )

  const instCategory = (fdr.institution?.type || 'DEFAULT').toUpperCase()
  const catConfig = categoriesConfig[instCategory] || categoriesConfig.DEFAULT || DEFAULT_DEPOSIT_CATEGORIES.DEFAULT

  // 2a. Amount below category requirement
  if (catConfig && catConfig.requiredAmount && Number(fdr.depositAmount) < catConfig.requiredAmount) {
    flags.push('AMOUNT_BELOW_CATEGORY_REQUIREMENT')
  }

  // 2b. Validity below configured minimum tenure
  if (fdr.instrumentType !== 'RTGS_DEPOSIT' && fdr.issueDate && fdr.maturityDate && catConfig?.minTenureMonths) {
    const tenureMonths =
      (new Date(fdr.maturityDate).getTime() - new Date(fdr.issueDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30.4375)
    if (tenureMonths < catConfig.minTenureMonths) {
      flags.push('VALIDITY_BELOW_MINIMUM')
    }
  }

  // 3. Manual verification pending too long
  const pendingAlertDays = await getSetting<number>('verification.pending_alert_days', 7)
  if (
    (fdr.trustLevel === 'SUBMITTED' || fdr.verificationStatus === 'SUBMITTED') &&
    fdr.lifecycleStatus !== 'RELEASED' &&
    fdr.lifecycleStatus !== 'RENEWED'
  ) {
    const daysSinceCreated = (Date.now() - new Date(fdr.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated >= pendingAlertDays) {
      flags.push('MANUAL_VERIFICATION_PENDING_EXCEEDED')
    }
  }

  // 4. Lien not confirmed
  if (
    fdr.lienStatus !== 'CONFIRMED_BY_STAFF' &&
    fdr.lienStatus !== 'CONFIRMED_BY_BANK' &&
    fdr.lifecycleStatus !== 'RELEASED'
  ) {
    flags.push('LIEN_NOT_CONFIRMED')
  }

  // Risk Level Determination
  let riskLevel: RiskLevel = 'LOW'
  const highRiskFlags = [
    'MATURITY_BEFORE_ISSUE_DATE',
    'MATURITY_DATE_ALREADY_PASSED',
    'INVALID_AMOUNT_NON_POSITIVE',
    'DUPLICATE_REFERENCE_ACROSS_BANKS',
    'AMOUNT_BELOW_CATEGORY_REQUIREMENT',
    'DEPOSITOR_NAME_MISMATCH',
  ]

  const hasHighRisk = flags.some((f) => highRiskFlags.includes(f))
  if (hasHighRisk || flags.length >= 3) {
    riskLevel = 'HIGH'
  } else if (flags.length > 0) {
    riskLevel = 'MEDIUM'
  }

  // Persist flags and riskLevel to the instrument
  await prisma.fDR.update({
    where: { id: fdrId },
    data: {
      flags: JSON.stringify(flags),
      riskLevel,
    },
  })

  return { flags, riskLevel }
}
