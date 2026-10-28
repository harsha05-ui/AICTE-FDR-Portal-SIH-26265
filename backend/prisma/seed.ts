import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { encryptBuffer } from '../src/lib/encryption'
import { config } from '../src/config'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding AICTE Statutory FDR / Security Deposit Registry database...')

  // Clean existing records
  await prisma.bankSimulationRecord.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.issuedOrder.deleteMany()
  await prisma.releaseStage.deleteMany()
  await prisma.hold.deleteMany()
  await prisma.workflowHistory.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.document.deleteMany()
  await prisma.verificationRecord.deleteMany()
  await prisma.renewalRecord.deleteMany()
  await prisma.releaseRequest.deleteMany()
  await prisma.fDR.deleteMany()
  await prisma.user.deleteMany()
  await prisma.institution.deleteMany()


  // 1. Seed 3 Institutions
  const inst1 = await prisma.institution.create({
    data: {
      id: 'inst-1',
      institutionCode: '1-10023412',
      name: '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)',
      address: 'Okhla Industrial Estate, Phase III',
      city: 'New Delhi',
      state: 'Delhi',
      region: 'Northern',
      type: 'Government',
      contactEmail: 'contact@iiitm-delhi.ac.in',
      contactPhone: '+91 11 2690 7400',
      principalName: 'Dr. Rajesh Sharma',
      status: 'ACTIVE',
    },
  })

  const inst2 = await prisma.institution.create({
    data: {
      id: 'inst-2',
      institutionCode: '1-10045891',
      name: '[DEMO] Veermata Jijabai Technological Institute (VJTI Mumbai)',
      address: 'H R Mahajani Marg, Matunga',
      city: 'Mumbai',
      state: 'Maharashtra',
      region: 'Western',
      type: 'Govt-Aided',
      contactEmail: 'registrar@vjti-mumbai.edu.in',
      contactPhone: '+91 22 2419 8100',
      principalName: 'Dr. Sunita Patil',
      status: 'ACTIVE',
    },
  })

  const inst3 = await prisma.institution.create({
    data: {
      id: 'inst-3',
      institutionCode: '1-10089234',
      name: '[DEMO] National Engineering & Technological College (NETC Bengaluru)',
      address: 'Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      region: 'Southern',
      type: 'Private-Unaided',
      contactEmail: 'info@netc-bengaluru.edu.in',
      contactPhone: '+91 80 2852 0100',
      principalName: 'Dr. K. Venkatesh',
      status: 'ACTIVE',
    },
  })

  // 2. Seed 5 Users (4 Roles + Second Institution User)
  const passwordHash = bcrypt.hashSync('password123', 10)

  const instUser1 = await prisma.user.create({
    data: {
      id: 'user-inst-1',
      name: '[DEMO] Dr. Rajesh Sharma',
      email: 'principal@iiitm-delhi.ac.in',
      passwordHash,
      role: 'INSTITUTION_USER',
      designation: 'Principal & Authorized Signatory',
      department: 'Executive Administration',
      institutionId: inst1.id,
    },
  })

  const instUser2 = await prisma.user.create({
    data: {
      id: 'user-inst-2',
      name: '[DEMO] Dr. Sunita Patil',
      email: 'registrar@vjti-mumbai.edu.in',
      passwordHash,
      role: 'INSTITUTION_USER',
      designation: 'Registrar',
      department: 'Academic & Statutory Compliance',
      institutionId: inst2.id,
    },
  })

  const reviewerUser = await prisma.user.create({
    data: {
      id: 'user-reviewer-1',
      name: '[DEMO] Anil Kumar Verma',
      email: 'reviewer@aicte.gov.in',
      passwordHash,
      role: 'REVIEWER',
      office: 'REGIONAL_OFFICE',
      designation: 'Senior Regional Compliance Officer',
      department: 'AICTE Northern Regional Bureau',
    },
  })

  const approverUser = await prisma.user.create({
    data: {
      id: 'user-approver-1',
      name: '[DEMO] Dr. M. S. Radhakrishnan',
      email: 'approver@aicte.gov.in',
      passwordHash,
      role: 'APPROVER',
      office: 'APPROVAL_BUREAU',
      designation: 'Director & Competent Authority',
      department: 'AICTE Approvals & Regulatory Bureau',
    },
  })

  const grievanceUser = await prisma.user.create({
    data: {
      id: 'user-grievance-1',
      name: '[DEMO] Meenakshi Sundaram',
      email: 'grievance@aicte.gov.in',
      passwordHash,
      role: 'REVIEWER',
      office: 'GRIEVANCE_CELL',
      designation: 'Public Grievance Officer',
      department: 'AICTE Central Grievance Redressal Cell',
    },
  })

  const vigilanceUser = await prisma.user.create({
    data: {
      id: 'user-vigilance-1',
      name: '[DEMO] Vikramaditya Singh',
      email: 'vigilance@aicte.gov.in',
      passwordHash,
      role: 'REVIEWER',
      office: 'VIGILANCE_CELL',
      designation: 'Chief Vigilance Inspector',
      department: 'AICTE Vigilance & Disciplinary Bureau',
    },
  })

  const competentUser = await prisma.user.create({
    data: {
      id: 'user-competent-1',
      name: '[DEMO] Prof. K. R. Nambiar',
      email: 'competent@aicte.gov.in',
      passwordHash,
      role: 'APPROVER',
      office: 'COMPETENT_AUTHORITY',
      designation: 'Member Secretary & Competent Authority',
      department: 'AICTE Executive Council',
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin-1',
      name: '[DEMO] S. K. Deshmukh',
      email: 'admin@aicte.gov.in',
      passwordHash,
      role: 'ADMIN',
      designation: 'Chief Systems Administrator',
      department: 'AICTE National Registry Operations',
    },
  })

  // 3. Ensure uploads folder exists and helper for sample encrypted document
  const uploadDir = path.resolve(config.UPLOAD_DIR)
  fs.mkdirSync(uploadDir, { recursive: true })

  async function createSampleDoc(fdrId: string, filename: string, user: typeof instUser1) {
    const sampleBuffer = Buffer.from(`%PDF-1.4\nAICTE Statutory Deposit Certificate for ${filename}\n%%EOF`)
    const { encrypted, iv, authTag } = encryptBuffer(sampleBuffer)
    const storageKey = `seed_doc_${fdrId}_${Date.now()}_${filename}`
    fs.writeFileSync(path.join(uploadDir, storageKey), encrypted)

    return prisma.document.create({
      data: {
        fdrId,
        documentType: 'FDR_CERTIFICATE',
        originalFilename: filename,
        storageKey,
        mimeType: 'application/pdf',
        size: sampleBuffer.length,
        version: 1,
        iv,
        authTag,
        uploadedBy: user.id,
      },
    })
  }

  // 4. Seed FDR Instruments (relative to today)
  const now = new Date()

  // 4.1. Instrument maturing in 7 days
  const fdr7Days = await prisma.fDR.create({
    data: {
      id: 'fdr-maturing-7d',
      institutionId: inst1.id,
      referenceNumber: 'FDR/SBI/2021/77190',
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase-III',
      ifscCode: 'SBIN0008077',
      accountNumber: '39482019485',
      depositAmount: 10000000, // ₹1,00,00,000
      interestRate: 7.25,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 5 * 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'EXPIRING',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })
  await createSampleDoc(fdr7Days.id, 'SBI_Deposit_77190.pdf', instUser1)

  // 4.2. Instrument maturing in 30 days
  const fdr30Days = await prisma.fDR.create({
    data: {
      id: 'fdr-maturing-30d',
      institutionId: inst2.id,
      referenceNumber: 'FDR/PNB/2021/88201',
      bankName: 'Punjab National Bank',
      branchName: 'Matunga Circle',
      ifscCode: 'PUNB0018800',
      accountNumber: '20194857291',
      depositAmount: 7500000, // ₹75,00,000
      interestRate: 7.1,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 5 * 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'EXPIRING',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser2.id,
    },
  })
  await createSampleDoc(fdr30Days.id, 'PNB_Receipt_88201.pdf', instUser2)

  // 4.3. Instrument already matured
  const fdrMatured = await prisma.fDR.create({
    data: {
      id: 'fdr-already-matured',
      institutionId: inst1.id,
      referenceNumber: 'FDR/BOB/2019/33219',
      bankName: 'Bank of Baroda',
      branchName: 'Connaught Place',
      ifscCode: 'BARB0CONNAU',
      accountNumber: '99201948201',
      depositAmount: 5000000, // ₹50,00,000
      interestRate: 6.8,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 5 * 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() - 15 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'MATURED',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })
  await createSampleDoc(fdrMatured.id, 'BOB_Matured_33219.pdf', instUser1)

  // 4.4. Long-term active instrument
  const fdrActive = await prisma.fDR.create({
    data: {
      id: 'fdr-longterm-active',
      institutionId: inst3.id,
      referenceNumber: 'FDR/CNB/2024/99120',
      bankName: 'Canara Bank',
      branchName: 'Electronic City',
      ifscCode: 'CNRB0002847',
      accountNumber: '77291048291',
      depositAmount: 15000000, // ₹1,50,00,000
      interestRate: 7.5,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 180 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 1600 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })
  await createSampleDoc(fdrActive.id, 'Canara_Statutory_99120.pdf', instUser1)

  // 4.5. Instrument with open discrepancy
  const fdrDiscrepancy = await prisma.fDR.create({
    data: {
      id: 'fdr-open-discrepancy',
      institutionId: inst2.id,
      referenceNumber: 'FDR/HDFC/2025/11029',
      bankName: 'HDFC Bank',
      branchName: 'Dadar West',
      ifscCode: 'HDFC0000240',
      accountNumber: '501002938475',
      depositAmount: 8500000,
      interestRate: 7.0,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 90 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
      verificationStatus: 'DISCREPANCY',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'HIGH',
      flags: JSON.stringify(['DUPLICATE_REFERENCE_ACROSS_BANKS', 'NO_DOCUMENTS_ATTACHED']),
      createdBy: instUser2.id,
    },
  })

  // 4.6. Instrument SUBMITTED awaiting review
  const fdrSubmitted = await prisma.fDR.create({
    data: {
      id: 'fdr-submitted-awaiting',
      institutionId: inst1.id,
      referenceNumber: 'FDR/ICICI/2026/44019',
      bankName: 'ICICI Bank',
      branchName: 'Nehru Place',
      ifscCode: 'ICIC0000007',
      accountNumber: '000701582910',
      depositAmount: 12000000, // ₹1,20,00,000
      interestRate: 7.3,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 1820 * 24 * 3600 * 1000),
      verificationStatus: 'SUBMITTED',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })
  await createSampleDoc(fdrSubmitted.id, 'ICICI_Deposit_44019.pdf', instUser1)

  // 4.7 & 4.8. Renewal chain (Old RENEWED -> New linked instrument)
  const fdrOldRenewal = await prisma.fDR.create({
    data: {
      id: 'fdr-renewal-chain-old',
      institutionId: inst1.id,
      referenceNumber: 'FDR/SBI/2020/55120',
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase-III',
      ifscCode: 'SBIN0008077',
      accountNumber: '39482019485',
      depositAmount: 6000000,
      interestRate: 6.9,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 6 * 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() - 365 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'RENEWED',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })

  const fdrNewRenewal = await prisma.fDR.create({
    data: {
      id: 'fdr-renewal-chain-new',
      institutionId: inst1.id,
      referenceNumber: 'RNW/SBI/2025/55121',
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase-III',
      ifscCode: 'SBIN0008077',
      accountNumber: '39482019485',
      depositAmount: 6000000,
      interestRate: 7.25,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 360 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 1460 * 24 * 3600 * 1000),
      verificationStatus: 'SUBMITTED',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'LOW',
      flags: '[]',
      previousFdrId: fdrOldRenewal.id,
      createdBy: instUser1.id,
    },
  })

  await prisma.fDR.update({
    where: { id: fdrOldRenewal.id },
    data: { replacementFdrId: fdrNewRenewal.id },
  })

  await prisma.renewalRecord.create({
    data: {
      previousFdrId: fdrOldRenewal.id,
      replacementFdrId: fdrNewRenewal.id,
      submittedBy: instUser1.id,
      type: 'RENEWAL',
      status: 'APPROVED',
      proposedAmount: 6000000,
      proposedMaturity: fdrNewRenewal.maturityDate,
      reviewedBy: approverUser.id,
      decisionAt: new Date(now.getTime() - 360 * 24 * 3600 * 1000),
      remarks: 'Statutory renewal docket verified and sanctioned.',
    },
  })

  // 4.9 & 4.10. REPLACEMENT chain (Old RENEWED -> New Replacement Instrument)
  const fdrOldRepl = await prisma.fDR.create({
    data: {
      id: 'fdr-replacement-chain-old',
      institutionId: inst2.id,
      referenceNumber: 'FDR/AXIS/2021/66201',
      bankName: 'Axis Bank',
      branchName: 'Dadar Branch',
      ifscCode: 'UTIB0000040',
      accountNumber: '912010048291',
      depositAmount: 8000000,
      interestRate: 7.1,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 4 * 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() - 100 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'RENEWED',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser2.id,
    },
  })

  const fdrNewRepl = await prisma.fDR.create({
    data: {
      id: 'fdr-replacement-chain-new',
      institutionId: inst2.id,
      referenceNumber: 'RNW/BOI/2025/66202',
      bankName: 'Bank of India',
      branchName: 'Matunga West',
      ifscCode: 'BKID0000014',
      accountNumber: '001410110029',
      depositAmount: 8000000,
      interestRate: 7.4,
      instrumentType: 'FDR',
      issueDate: new Date(now.getTime() - 95 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 1720 * 24 * 3600 * 1000),
      verificationStatus: 'SUBMITTED',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'LOW',
      flags: '[]',
      previousFdrId: fdrOldRepl.id,
      createdBy: instUser2.id,
    },
  })

  await prisma.fDR.update({
    where: { id: fdrOldRepl.id },
    data: { replacementFdrId: fdrNewRepl.id },
  })

  await prisma.renewalRecord.create({
    data: {
      previousFdrId: fdrOldRepl.id,
      replacementFdrId: fdrNewRepl.id,
      submittedBy: instUser2.id,
      type: 'REPLACEMENT',
      status: 'APPROVED',
      proposedAmount: 8000000,
      newBankName: 'Bank of India',
      newBranchName: 'Matunga West',
      reviewedBy: approverUser.id,
      decisionAt: new Date(now.getTime() - 95 * 24 * 3600 * 1000),
      remarks: 'Replacement sanctioned under Section 10 AICTE Act.',
    },
  })

  // 4.11. SECURITY_DEPOSIT instrument
  const fdrSecDep = await prisma.fDR.create({
    data: {
      id: 'fdr-security-deposit',
      institutionId: inst3.id,
      referenceNumber: 'SEC/UBI/2023/10294',
      bankName: 'Union Bank of India',
      branchName: 'Koramangala',
      ifscCode: 'UBIN0538201',
      accountNumber: '38201948201',
      depositAmount: 2500000, // ₹25,00,000
      interestRate: 7.2,
      instrumentType: 'SECURITY_DEPOSIT',
      issueDate: new Date(now.getTime() - 365 * 24 * 3600 * 1000),
      maturityDate: new Date(now.getTime() + 1400 * 24 * 3600 * 1000),
      verificationStatus: 'VERIFIED',
      lifecycleStatus: 'ACTIVE',
      riskLevel: 'LOW',
      flags: '[]',
      createdBy: instUser1.id,
    },
  })
  await createSampleDoc(fdrSecDep.id, 'UnionBank_Security_Deposit.pdf', instUser1)

  // 5. Seed Verification Record for Verified Instrument
  await prisma.verificationRecord.create({
    data: {
      fdrId: fdr7Days.id,
      reviewerId: reviewerUser.id,
      result: 'VERIFIED',
      source: 'MANUAL_REVIEW',
      remarks: 'Statutory certificate verified against bank mandate.',
      verifiedAt: new Date(now.getTime() - 100 * 24 * 3600 * 1000),
    },
  })

  // 6. Seed Sample Notifications
  await prisma.notification.create({
    data: {
      userId: instUser1.id,
      fdrId: fdr7Days.id,
      type: 'MATURITY_ALERT',
      thresholdDays: 7,
      title: 'FDR Maturing within 7 Days',
      message: `Instrument ${fdr7Days.referenceNumber} (${fdr7Days.bankName}) matures on ${fdr7Days.maturityDate.toISOString().slice(0, 10)}. Immediate renewal docket required.`,
      urgency: 'URGENT',
      dueDate: fdr7Days.maturityDate,
    },
  })

  await prisma.notification.create({
    data: {
      userId: reviewerUser.id,
      fdrId: fdr7Days.id,
      type: 'MATURITY_ALERT',
      thresholdDays: 7,
      title: 'FDR Maturing within 7 Days',
      message: `Instrument ${fdr7Days.referenceNumber} (${fdr7Days.bankName}) matures on ${fdr7Days.maturityDate.toISOString().slice(0, 10)}.`,
      urgency: 'URGENT',
      dueDate: fdr7Days.maturityDate,
    },
  })

  // 7. Seed Sample Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorRole: adminUser.role,
      action: 'SYSTEM_INITIALIZE',
      entityType: 'System',
      entityId: 'global',
      changeSummary: 'Seeded initial statutory database with demo institutions, instruments, and users.',
      ipAddress: '127.0.0.1',
    },
  })

  // 8. Seed Bank Simulation Records (for MOCK_DEMO bank verification adapter)
  await prisma.bankSimulationRecord.createMany({
    data: [
      {
        bankName: 'Canara Bank',
        referenceNumber: 'FDR/CNB/2024/99120',
        accountNumber: '77291048291',
        depositAmount: 15000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2021/77190',
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'Punjab National Bank',
        referenceNumber: 'FDR/PNB/2021/88201',
        accountNumber: '20194857291',
        depositAmount: 7500000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/MISMATCH/001',
        accountNumber: '1029384756',
        depositAmount: 5000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2026/DEMO-PASS',
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'Punjab National Bank',
        referenceNumber: 'FDR/PNB/2026/DEMO-AMOUNT-MISMATCH',
        accountNumber: '20194857291',
        depositAmount: 8000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'Canara Bank',
        referenceNumber: 'FDR/CNB/2026/DEMO-NAME-MISMATCH',
        accountNumber: '77291048291',
        depositAmount: 15000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'ABC Commercial Builders Pvt Ltd',
      },
    ],
  })

  // 9. Seed Configuration Settings (All sample values marked isSample = true)
  await prisma.setting.createMany({
    data: [
      {
        key: 'verification.adapter_mode',
        value: JSON.stringify('MOCK_DEMO'),
        description: '[SAMPLE] Bank verification adapter mode: MANUAL, MOCK_DEMO (default in sandbox), or LIVE',
        isSample: true,
      },
      {
        key: 'instruments.required_fields',
        value: JSON.stringify({
          FDR: ['referenceNumber', 'bankName', 'branchName', 'issueDate', 'maturityDate', 'depositAmount'],
          RTGS_DEPOSIT: ['referenceNumber', 'bankName', 'issueDate', 'depositAmount'],
          BANK_GUARANTEE: ['referenceNumber', 'bankName', 'issueDate', 'maturityDate', 'depositAmount'],
        }),
        description: '[SAMPLE] Mandatory statutory fields per instrument type',
        isSample: true,
      },
      {
        key: 'reminders.thresholds_days',
        value: JSON.stringify([90, 60, 30, 15, 7, 0]),
        description: '[SAMPLE] Statutory alert thresholds before maturity in calendar days',
        isSample: true,
      },
      {
        key: 'escalation.days',
        value: JSON.stringify(3),
        description: '[SAMPLE] Escalation threshold for overdue regulatory review',
        isSample: true,
      },
      {
        key: 'verification.pending_alert_days',
        value: JSON.stringify(14),
        description: '[SAMPLE] Days before manual verification alert is raised',
        isSample: true,
      },
      {
        key: 'release.stage_order',
        value: JSON.stringify([
          'REGIONAL_OFFICE',
          'APPROVAL_BUREAU',
          'GRIEVANCE_CELL',
          'VIGILANCE_CELL',
          'COMPETENT_AUTHORITY',
        ]),
        description: '[SAMPLE] Multi-office release approval workflow sequence',
        isSample: true,
      },
      {
        key: 'release.stage_sla_days',
        value: JSON.stringify({
          REGIONAL_OFFICE: 7,
          APPROVAL_BUREAU: 7,
          GRIEVANCE_CELL: 5,
          VIGILANCE_CELL: 5,
          COMPETENT_AUTHORITY: 3,
        }),
        description: '[SAMPLE] Service Level Agreement target days per release stage',
        isSample: true,
      },
      {
        key: 'deposit.categories',
        value: JSON.stringify({
          ENGINEERING: { requiredAmount: 3500000, minTenureMonths: 60 },
          MANAGEMENT: { requiredAmount: 1500000, minTenureMonths: 60 },
          PHARMACY: { requiredAmount: 1500000, minTenureMonths: 60 },
          ARCHITECTURE: { requiredAmount: 1500000, minTenureMonths: 60 },
          DEFAULT: { requiredAmount: 1000000, minTenureMonths: 60 },
        }),
        description: '[SAMPLE] Minimum statutory deposit amount and tenure per institution category',
        isSample: true,
      },
      {
        key: 'documents.required_by_type',
        value: JSON.stringify({
          FDR: [
            { slotType: 'FDR_CERTIFICATE', label: 'FDR Certificate / Fixed Deposit Receipt', mandatory: true, description: 'Original stamped deposit certificate issued by the commercial bank.' },
            { slotType: 'BANK_CONFIRMATION_LETTER', label: 'Bank Confirmation Letter / Statement', mandatory: true, description: 'Formal confirmation letter from the branch manager or certified bank statement.' },
            { slotType: 'LIEN_ENDORSEMENT', label: 'AICTE Lien Endorsement Notation', mandatory: true, description: 'Irrevocable lien marking letter in favour of Member Secretary, AICTE.' },
            { slotType: 'INSTITUTION_REQUEST_LETTER', label: 'Institutional Request Letter / Board Resolution', mandatory: true, description: 'Authorised signatory request letter on institutional letterhead.' },
          ],
          RTGS_DEPOSIT: [
            { slotType: 'RTGS_RECEIPT', label: 'RTGS / NEFT UTR Transfer Receipt', mandatory: true, description: 'Bank payment debit advice with valid UTR number.' },
            { slotType: 'BANK_STATEMENT', label: 'Bank Statement Showing Remittance', mandatory: true, description: 'Certified bank account statement reflecting transferred funds.' },
            { slotType: 'INSTITUTION_REQUEST_LETTER', label: 'Institutional Request Letter', mandatory: true, description: 'Authorised signatory letter pledging statutory deposit funds.' },
          ],
          BANK_GUARANTEE: [
            { slotType: 'BG_CERTIFICATE', label: 'Original Bank Guarantee Deed', mandatory: true, description: 'Original stamped and executed Bank Guarantee covenant.' },
            { slotType: 'SFMS_CONFIRMATION', label: 'SFMS Structured Financial Messaging Advice', mandatory: true, description: 'SFMS confirmation copy (IFN 760 COV) transmitted via banking network.' },
            { slotType: 'INSTITUTION_REQUEST_LETTER', label: 'Institutional Request Letter', mandatory: true, description: 'Board resolution and request letter submitting the guarantee.' },
          ],
        }),
        description: '[SAMPLE] Required statutory document slots per instrument type with mandatory flags',
        isSample: true,
      },
      {
        key: 'submission.gate_mode',
        value: JSON.stringify('STRICT_BANK_RECEIPT'),
        description: '[SAMPLE] Pre-submission gate mode: STRICT_BANK_RECEIPT (default) or DOCUMENT_ONLY',
        isSample: true,
      },
      {
        key: 'submission.name_match_threshold',
        value: JSON.stringify(0.8),
        description: '[SAMPLE] Minimum fuzzy name match similarity threshold [0.0 - 1.0] for depositor verification',
        isSample: true,
      },
    ],
  })

  // 10. Seed Sample Regulatory Holds
  await prisma.hold.createMany({
    data: [
      {
        institutionId: inst3.id,
        reason: '[DEMO] Pending judicial inquiry regarding technical program faculty cadre ratio compliance',
        sourceBody: 'High Court of Karnataka',
        referenceNo: 'HC/KAR/2026/WP-88102',
        active: true,
        placedBy: approverUser.id,
      },
      {
        institutionId: inst2.id,
        reason: '[DEMO] Regulatory inquiry on institutional land title verification',
        sourceBody: 'AICTE Vigilance Bureau',
        referenceNo: 'AICTE/VIG/2025/INQ-331',
        active: false,
        placedBy: approverUser.id,
        clearedBy: approverUser.id,
        clearedAt: new Date(now.getTime() - 20 * 24 * 3600 * 1000),
        clearRemarks: 'Land title and mutation certificates fully verified by Regional Directorate.',
      },
    ],
  })

  // 11. Seed Pre-Configured Bank Simulation Records for Demo Testing
  await prisma.bankSimulationRecord.deleteMany({})
  await prisma.bankSimulationRecord.createMany({
    data: [
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2021/77190',
        accountNumber: '39482019485',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2026/DEMO-PASS',
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2026/DEMO-AMT-MISMATCH',
        accountNumber: '1029384756',
        depositAmount: 5000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2026/DEMO-NAME-MISMATCH',
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2026/PASS',
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'Punjab National Bank',
        referenceNumber: 'FDR/PNB/2026/DEMO-PASS',
        accountNumber: '5544332211',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
      {
        bankName: 'Canara Bank',
        referenceNumber: 'FDR/CAN/2026/DEMO-PASS',
        accountNumber: '9988776655',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
    ],
  })

  console.log('Database successfully seeded with realistic statutory demo data.')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
