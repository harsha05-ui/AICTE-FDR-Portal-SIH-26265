import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import { prisma } from './prisma'
import { config } from '../config'
import { encryptFileSelfContained, decryptFileSelfContained } from './encryption'

export interface OrderGenerationInput {
  releaseRequestId: string
  issuedById: string
  issuedByName: string
  issuedByRole?: string
}

export async function generateAndSaveIssuedOrder(input: OrderGenerationInput) {
  const { releaseRequestId, issuedById, issuedByName } = input

  // Check if an order already exists for this release request
  const existingOrder = await prisma.issuedOrder.findUnique({
    where: { releaseRequestId },
  })
  if (existingOrder) {
    return existingOrder
  }

  const release = await prisma.releaseRequest.findUnique({
    where: { id: releaseRequestId },
    include: {
      fdr: {
        include: { institution: true },
      },
      requester: true,
    },
  })

  if (!release) {
    throw new Error(`Release request ${releaseRequestId} not found for order issuance.`)
  }

  const fdr = release.fdr
  const inst = fdr.institution
  const now = new Date()
  const year = now.getFullYear()

  // Determine order type: NOC for FDR and BANK_GUARANTEE; SANCTION_ORDER for RTGS_DEPOSIT
  const orderType: 'NOC' | 'SANCTION_ORDER' =
    fdr.instrumentType === 'RTGS_DEPOSIT' ? 'SANCTION_ORDER' : 'NOC'

  // Generate reference number: NOC/DEMO/YYYY/NNNN
  const prefix = orderType === 'NOC' ? 'NOC' : 'SANCTION'
  const countThisYear = await prisma.issuedOrder.count({
    where: {
      referenceNo: { startsWith: `${prefix}/DEMO/${year}/` },
    },
  })
  const seq = String(countThisYear + 1).padStart(4, '0')
  const referenceNo = `${prefix}/DEMO/${year}/${seq}`

  // Generate PDF buffer
  const pdfBuffer = await buildOrderPdfBuffer({
    orderType,
    referenceNo,
    institutionName: inst.name,
    permanentId: inst.institutionCode,
    institutionAddress: [inst.address, inst.city, inst.state].filter(Boolean).join(', ') || 'N/A',
    instrumentType: fdr.instrumentType,
    fdrNumber: fdr.referenceNumber,
    bankName: fdr.bankName,
    branchName: fdr.branchName || 'Main Branch',
    depositAmount: Number(fdr.depositAmount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    issueDate: fdr.issueDate ? new Date(fdr.issueDate).toLocaleDateString('en-IN') : 'N/A',
    maturityDate: fdr.maturityDate ? new Date(fdr.maturityDate).toLocaleDateString('en-IN') : 'N/A',
    trustSimulated: Boolean(fdr.trustSimulated),
    approvedBy: issuedByName,
    approvedAt: now,
  })

  // Encrypt PDF buffer
  const encrypted = encryptFileSelfContained(pdfBuffer)
  const storageKey = `order_${release.id}_${Date.now()}.bin`
  const uploadDir = path.resolve(config.UPLOAD_DIR)
  fs.mkdirSync(uploadDir, { recursive: true })
  fs.writeFileSync(path.join(uploadDir, storageKey), encrypted)

  // Record in IssuedOrder
  const issuedOrder = await prisma.issuedOrder.create({
    data: {
      releaseRequestId: release.id,
      type: orderType,
      referenceNo,
      filePath: storageKey,
      issuedBy: issuedById,
      issuedAt: now,
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: issuedById,
      actorName: issuedByName,
      actorRole: input.issuedByRole || 'APPROVER',
      action: 'ISSUE_STATUTORY_ORDER',
      entityType: 'IssuedOrder',
      entityId: issuedOrder.id,
      changeSummary: `Generated official ${orderType} ${referenceNo} for release of ${fdr.referenceNumber} (${inst.name}).`,
      metadata: JSON.stringify({
        referenceNo,
        orderType,
        simulated: fdr.trustSimulated,
        fdrId: fdr.id,
        institutionId: inst.id,
      }),
    },
  })

  return issuedOrder
}

export function readAndDecryptOrderPdf(filePath: string): Buffer {
  const fullPath = path.resolve(config.UPLOAD_DIR, filePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Order file not found at ${filePath}`)
  }
  const encrypted = fs.readFileSync(fullPath)
  return decryptFileSelfContained(encrypted)
}

function buildOrderPdfBuffer(data: {
  orderType: 'NOC' | 'SANCTION_ORDER'
  referenceNo: string
  institutionName: string
  permanentId?: string
  institutionAddress: string
  instrumentType: string
  fdrNumber: string
  bankName: string
  branchName: string
  depositAmount: string
  issueDate: string
  maturityDate: string
  trustSimulated: boolean
  approvedBy: string
  approvedAt: Date
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header banner
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('ALL INDIA COUNCIL FOR TECHNICAL EDUCATION', { align: 'center' })
      .fontSize(10)
      .font('Helvetica')
      .text('(A Statutory Body of the Government of India, Ministry of Education)', { align: 'center' })
      .text('Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | www.aicte-india.org', { align: 'center' })
      .moveDown(0.5)

    // Demo watermark / disclaimer box
    doc
      .rect(40, doc.y, 515, 20)
      .fillAndStroke('#fff3cd', '#ffeeba')
    doc
      .fillColor('#856404')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('*** [DEMO] STATUTORY SANCTION DOCUMENT - FOR DEMONSTRATION PURPOSES ONLY ***', 45, doc.y - 15, {
        align: 'center',
        width: 505,
      })
      .fillColor('#000000')
      .moveDown(1.5)

    // Document Title
    const titleText =
      data.orderType === 'NOC'
        ? 'NO OBJECTION CERTIFICATE (NOC) FOR RELEASE OF SECURITY DEPOSIT'
        : 'STATUTORY SANCTION ORDER FOR REFUND / RELEASE OF SECURITY DEPOSIT'

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(titleText, { align: 'center', underline: true })
      .moveDown(0.8)

    // Reference and Date line
    const yRef = doc.y
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Ref No: ${data.referenceNo}`, 40, yRef)
    doc
      .font('Helvetica')
      .text(`Date of Issuance: ${data.approvedAt.toLocaleDateString('en-IN')}`, 350, yRef, { align: 'right' })
      .moveDown(1.5)

    // Institution Details Box
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TO THE BRANCH MANAGER / AUTHORIZED STATUTORY OFFICER:')
      .font('Helvetica')
      .text(`Bank & Branch: ${data.bankName}, ${data.branchName}`)
      .moveDown(0.5)

    doc
      .font('Helvetica-Bold')
      .text('SUB: ')
      .font('Helvetica')
      .text(
        `Clearance and unconditional release of AICTE Statutory Joint Deposit in favor of ${data.institutionName} (AICTE Permanent ID: ${data.permanentId || 'N/A'}).`,
        { align: 'justify' }
      )
      .moveDown(0.8)

    // Instrument Details Table
    doc
      .rect(40, doc.y, 515, 110)
      .stroke('#cccccc')

    const startTableY = doc.y + 8
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('STATUTORY INSTRUMENT DETAILS', 50, startTableY)

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(`• Instrument Type: ${data.instrumentType}`, 50, startTableY + 18)
      .text(`• Deposit Reference / FDR Number: ${data.fdrNumber}`, 50, startTableY + 34)
      .text(`• Sanctioned Release Amount: INR ${data.depositAmount}`, 50, startTableY + 50)
      .text(`• Date of Issue: ${data.issueDate}`, 50, startTableY + 66)
      .text(`• Date of Maturity: ${data.maturityDate}`, 50, startTableY + 82)
      .text(`• Beneficiary: Member Secretary, AICTE`, 280, startTableY + 18)
      .text(`• Institution: ${data.institutionName}`, 280, startTableY + 34)
      .text(`• Address: ${data.institutionAddress}`, 280, startTableY + 50, { width: 260 })

    doc.y = startTableY + 105
    doc.moveDown(1)

    // Formal Certification Paragraph
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        '1. It is hereby certified that the institution named herein has fulfilled the lock-in and statutory deposit covenants prescribed under the All India Council for Technical Education Approval Process Handbook.',
        { align: 'justify' }
      )
      .moveDown(0.5)
      .text(
        '2. The competent multi-tier regulatory cells, including Regional Directorate, Approval Bureau, Grievance Cell, Vigilance Bureau, and Competent Authority, have accorded unconditional statutory clearance.',
        { align: 'justify' }
      )
      .moveDown(0.5)
      .text(
        '3. The All India Council for Technical Education has NO OBJECTION to the encashment, closure, or refund of the aforementioned security deposit in favor of the authorized signatory of the institution.',
        { align: 'justify' }
      )
      .moveDown(1)

    // Simulation notice if applicable
    if (data.trustSimulated) {
      doc
        .rect(40, doc.y, 515, 22)
        .fillAndStroke('#e2e3e5', '#d6d8db')
      doc
        .fillColor('#383d41')
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(
          '[SIMULATION AUDIT NOTICE] Bank confirmation for this deposit was processed via the AICTE Mock Verification Adapter (trustSimulated = true). All entries are demonstration records.',
          45,
          doc.y - 17,
          { width: 505, align: 'center' }
        )
        .fillColor('#000000')
        .moveDown(1.5)
    }

    doc.moveDown(2)

    // Signature Area
    const signY = doc.y
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Digitally Authorized By:', 340, signY)
      .font('Helvetica')
      .text(data.approvedBy, 340, signY + 15)
      .text('Competent Statutory Authority', 340, signY + 30)
      .text('AICTE, New Delhi', 340, signY + 45)

    doc.end()
  })
}
