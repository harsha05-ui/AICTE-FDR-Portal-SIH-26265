import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

const DEMO_DIR = path.resolve(__dirname, '../../demo-documents')
const PUBLIC_DEMO_DIR = path.resolve(__dirname, '../../public/demo-documents')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function writePdf(filePath: string, drawFn: (doc: typeof PDFDocument.prototype) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      compress: false,
      info: {
        Title: path.basename(filePath),
        Author: 'AICTE Statutory Security Deposit System',
        Subject: 'Demo Statutory Compliance Document',
      },
    })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)
    drawFn(doc)
    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', (err) => reject(err))
  })
}

async function generateAllDemoDocuments() {
  ensureDir(DEMO_DIR)
  ensureDir(path.join(DEMO_DIR, 'test-cases'))
  ensureDir(PUBLIC_DEMO_DIR)
  ensureDir(path.join(PUBLIC_DEMO_DIR, 'test-cases'))

  console.log('Generating demo statutory documents...')

  // =========================================================================
  // 1. FDR Certificate (PASS)
  // =========================================================================
  const drawFdrCertPass = (doc: any) => {
    // Outer decorative border
    doc.rect(25, 25, 545, 792).lineWidth(2).strokeColor('#0B1B3D').stroke()
    doc.rect(29, 29, 537, 784).lineWidth(0.5).strokeColor('#8892B0').stroke()

    // Bank Header
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 40, 50, { align: 'center' })
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text('Commercial Network Branch • Okhla Industrial Area, Phase 3, New Delhi - 110020', { align: 'center' })
    doc.text('IFSC Code: SBIN0008077 • Phone: +91-11-26810012 • Web: www.sbi.co.in', { align: 'center' })

    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#059669').text('FIXED DEPOSIT RECEIPT (SPECIAL TERM DEPOSIT)', { align: 'center' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#B45309').text('[ HELD IN JOINT NAME WITH STATUTORY LIEN TO AICTE ]', { align: 'center' })

    // Details Grid Box
    doc.moveDown(1)
    const startY = 140
    doc.rect(45, startY, 505, 300).fillColor('#F8FAFC').fillAndStroke('#CBD5E1')

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A')
    
    // Rows
    const rows = [
      ['FDR / Receipt Number:', 'FDR/SBI/2026/DEMO-PASS'],
      ['Deposit Account No:', '1029384756'],
      ['Depositor / Institution Name:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['Joint Account Beneficiary:', 'Member Secretary, All India Council for Technical Education (AICTE)'],
      ['Bank Name & Branch:', 'State Bank of India • Branch: Okhla Phase 3'],
      ['IFSC Code:', 'SBIN0008077'],
      ['Principal Deposit Amount:', 'Rs. 1,00,00,000  (One Crore Rupees Only)'],
      ['Annual Interest Rate:', '7.25% per annum (Compounded Quarterly)'],
      ['Date of Issue / Deposit Date:', '01/01/2025'],
      ['Maturity Date / Due Date:', '01/01/2030 (Term: 60 Months)'],
      ['Maturity Value at Expiry:', 'Rs. 1,43,23,645  (Rupees One Crore Forty Three Lakhs...)'],
    ]

    let curY = startY + 15
    for (const [k, v] of rows) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1E293B').text(k, 55, curY, { width: 180 })
      doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A').text(v, 240, curY, { width: 300 })
      curY += 25
    }

    // Statutory Endorsement Box
    const endY = 460
    doc.rect(45, endY, 505, 120).fillColor('#FEF3C7').fillAndStroke('#F59E0B')
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#92400E').text('MANDATORY STATUTORY LIEN & JOINT HOLDING ENDORSEMENT', 55, endY + 12)
    doc.font('Helvetica').fontSize(8.5).fillColor('#78350F').text(
      '1. This Term Deposit is placed under the statutory requirements of the AICTE Approval Process Handbook (APH).\n' +
      '2. Lien marked in favour of Member Secretary, AICTE. The bank has inscribed this irrevocable lien in core banking ledger.\n' +
      '3. No premature liquidation, withdrawal, encashment, loan, or overdraft shall be permitted without prior written NOC issued by the Member Secretary, AICTE, New Delhi.\n' +
      '4. On maturity date (01/01/2030), this deposit is subject to statutory renewal unless formal discharge is notified.',
      55, endY + 32, { width: 485, lineGap: 3 }
    )

    // Signatures
    const sigY = 660
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
    doc.text('For STATE BANK OF INDIA', 60, sigY)
    doc.text('AUTHORIZED SIGNATORY / BRANCH MANAGER', 60, sigY + 45)
    doc.font('Helvetica').fontSize(8).fillColor('#475569')
    doc.text('Branch Code: 08077 • Seal & Stamp Affixed', 60, sigY + 58)

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
    doc.text('For IIITM DELHI (HOLDING INSTITUTION)', 320, sigY)
    doc.text('PRINCIPAL / REGISTRAR SIGNATURE', 320, sigY + 45)
    doc.font('Helvetica').fontSize(8).fillColor('#475569')
    doc.text('AICTE Permanent ID: 1-10023412', 320, sigY + 58)

    // Security watermark footer
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
    doc.text('SECURITY DOCUMENT • FOR OFFICIAL REGULATORY VERIFICATION IN SURAKSHAKOSH PORTAL', 40, 770, { align: 'center' })
  }

  // =========================================================================
  // 2. Bank Confirmation Letter (PASS)
  // =========================================================================
  const drawBankLetterPass = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(1).strokeColor('#0B1B3D').stroke()

    // Header
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 45, 45)
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text('Okhla Industrial Area Branch, Phase 3, New Delhi - 110020', 45, 65)
    doc.font('Helvetica').fontSize(8).text('IFSC: SBIN0008077 • Email: sbi.08077@sbi.co.in • Phone: 011-26810012', 45, 78)
    doc.moveTo(45, 95).lineTo(550, 95).lineWidth(0.5).strokeColor('#CBD5E1').stroke()

    // Date & Ref
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Ref No: SBI/OKHLA/AICTE/CONF/2025/084', 45, 110)
    doc.font('Helvetica').fontSize(9).text('Date: 01/01/2025', 430, 110)

    // Addressee
    doc.moveDown(1.5)
    doc.font('Helvetica-Bold').fontSize(9).text('To,')
    doc.text('The Member Secretary,')
    doc.font('Helvetica').text('All India Council for Technical Education (AICTE),')
    doc.text('Nelson Mandela Marg, Vasant Kunj,')
    doc.text('New Delhi - 110070.')

    // Subject
    doc.moveDown(1)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B1B3D').text(
      'SUBJECT: STATUTORY CONFIRMATION OF FIXED DEPOSIT RECEIPT NO. FDR/SBI/2026/DEMO-PASS FOR RS. 1,00,00,000/-',
      { underline: true }
    )

    // Body
    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(9).fillColor('#1E293B').text(
      'Respected Sir / Madam,\n\n' +
      'We hereby certify and confirm that the undermentioned Fixed Deposit has been opened and stands in the books of our branch in accordance with AICTE regulations:\n',
      { lineGap: 3 }
    )

    // Table
    const tableY = 250
    doc.rect(45, tableY, 505, 190).fillColor('#F8FAFC').fillAndStroke('#E2E8F0')
    const tRows = [
      ['Name of Commercial Bank:', 'State Bank of India'],
      ['Branch Name & Locality:', 'Okhla Phase 3, New Delhi'],
      ['IFSC Code:', 'SBIN0008077'],
      ['FDR / Receipt Number:', 'FDR/SBI/2026/DEMO-PASS'],
      ['Deposit Account Number:', '1029384756'],
      ['Depositor Name / Institution:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['Beneficiary / Joint Holder:', 'Member Secretary, AICTE'],
      ['Deposit Amount:', 'Rs. 1,00,00,000 (Rupees One Crore Only)'],
      ['Deposit Date / Date of Issue:', '01/01/2025'],
      ['Maturity Date:', '01/01/2030'],
      ['Statutory Lien Status:', 'Lien marked in favour of Member Secretary, AICTE in Core Banking System (CBS)'],
    ]
    let ty = tableY + 10
    for (const [k, v] of tRows) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(k, 55, ty, { width: 170 })
      doc.font('Helvetica').fontSize(8.5).fillColor('#0F172A').text(v, 230, ty, { width: 310 })
      ty += 16
    }

    doc.font('Helvetica').fontSize(9).fillColor('#1E293B').text(
      '\nWe further explicitly confirm that:\n' +
      '1. The said Fixed Deposit Receipt has been created with irrevocable lien marked in favour of Member Secretary, AICTE.\n' +
      '2. The bank shall not release, encash, liquidate, or allow any advance against the deposit without prior written clearance from AICTE.\n' +
      '3. In the event of statutory invocation by AICTE, the proceeds will be remitted to AICTE designated account on first demand.',
      45, 460, { lineGap: 3 }
    )

    // Signature
    const sigY = 630
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
    doc.text('Yours faithfully,', 45, sigY)
    doc.text('For STATE BANK OF INDIA', 45, sigY + 30)
    doc.text('CHIEF MANAGER / BRANCH IN-CHARGE', 45, sigY + 65)
    doc.font('Helvetica').fontSize(8).fillColor('#64748B')
    doc.text('Staff Code: SBI-98124 • Branch Code: 08077 • Official Bank Seal Affixed', 45, sigY + 78)
  }

  // =========================================================================
  // 3. Lien Endorsement Letter (PASS)
  // =========================================================================
  const drawLienEndorsementPass = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(1).strokeColor('#B45309').stroke()

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 45, 45, { align: 'center' })
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text('Branch: Okhla Phase 3, New Delhi • IFSC: SBIN0008077', { align: 'center' })

    doc.moveDown(1.5)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#B45309').text('CERTIFICATE OF IRREVOCABLE STATUTORY LIEN ENDORSEMENT', { align: 'center' })
    doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text('Issued pursuant to AICTE Approval Process Handbook (APH) Statutory Regulations', { align: 'center' })

    doc.moveDown(1)
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B').text(
      'TO WHOMSOEVER IT MAY CONCERN\n\n' +
      'This is to certify that an Irrevocable and Exclusive Statutory Lien has been duly recorded and inscribed in the core banking records of State Bank of India, Okhla Phase 3 Branch, against the deposit instrument described below:\n',
      45, 140, { lineGap: 3 }
    )

    const boxY = 220
    doc.rect(45, boxY, 505, 180).fillColor('#FFFBEB').fillAndStroke('#FDE68A')
    const lienRows = [
      ['Deposit Certificate No:', 'FDR/SBI/2026/DEMO-PASS'],
      ['Deposit Account Number:', '1029384756'],
      ['Commercial Bank & Branch:', 'State Bank of India, Okhla Phase 3 Branch'],
      ['IFSC Code:', 'SBIN0008077'],
      ['Depositor Name:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['Statutory Beneficiary:', 'Member Secretary, All India Council for Technical Education (AICTE)'],
      ['Deposit Amount:', 'Rs. 1,00,00,000 (One Crore Rupees Only)'],
      ['Date of Issue / Deposit Date:', '01/01/2025'],
      ['Maturity Date:', '01/01/2030'],
      ['Lien Inscription Ref:', 'LIEN/SBI/08077/AICTE/2025/11'],
    ]

    let ly = boxY + 12
    for (const [k, v] of lienRows) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#92400E').text(k, 55, ly, { width: 170 })
      doc.font('Helvetica').fontSize(9).fillColor('#1E293B').text(v, 230, ly, { width: 310 })
      ly += 16
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('STATUTORY LIEN DECLARATION:', 45, 430)
    doc.font('Helvetica').fontSize(9).fillColor('#1E293B').text(
      '1. Lien marked in favour of Member Secretary, AICTE. The deposit is held jointly and cannot be modified without AICTE consent.\n' +
      '2. The Bank undertakes not to discharge, refund, or permit premature liquidation or loan advance on the said deposit to the depositor institution without express written permission / NOC from AICTE.\n' +
      '3. This endorsement remains valid and binding on the bank until formal notice of release is communicated by AICTE.',
      45, 445, { lineGap: 4 }
    )

    // Signatures
    const sigY = 640
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
    doc.text('FOR STATE BANK OF INDIA', 45, sigY)
    doc.text('BRANCH MANAGER / LIEN OFFICER', 45, sigY + 50)
    doc.font('Helvetica').fontSize(8).fillColor('#64748B')
    doc.text('Seal of the Branch Attached • Date: 01/01/2025', 45, sigY + 65)
  }

  // =========================================================================
  // 4. Institution Request Letter (PASS)
  // =========================================================================
  const drawInstLetterPass = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(1).strokeColor('#0F172A').stroke()

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#0B1B3D').text(
      'INDRAPRASTHA INSTITUTE OF INFORMATION TECHNOLOGY & MANAGEMENT',
      45, 45, { align: 'center' }
    )
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(
      'Approved by AICTE, Ministry of Education, Govt. of India • AICTE Permanent ID: 1-10023412',
      { align: 'center' }
    )
    doc.text('Campus: Plot No. 8, Institutional Area, Okhla, New Delhi - 110025 • Web: www.iiitm-delhi.ac.in', { align: 'center' })
    doc.moveTo(45, 85).lineTo(550, 85).lineWidth(0.5).strokeColor('#CBD5E1').stroke()

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text('Ref: IIITM/AICTE/FDR/SUBMISSION/2025/012', 45, 100)
    doc.font('Helvetica').fontSize(9).text('Date: 01/01/2025', 430, 100)

    doc.moveDown(1.5)
    doc.font('Helvetica-Bold').fontSize(9).text('To,')
    doc.text('The Member Secretary,')
    doc.font('Helvetica').text('All India Council for Technical Education,')
    doc.text('Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070.')

    doc.moveDown(1)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B1B3D').text(
      'SUBJECT: SUBMISSION OF STATUTORY JOINT SECURITY DEPOSIT FDR NO. FDR/SBI/2026/DEMO-PASS OF RS. 1,00,00,000/-',
      { underline: true }
    )

    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B').text(
      'Respected Sir,\n\n' +
      'In compliance with the statutory provisions of the AICTE Approval Process Handbook (APH) for the extension of approval of our technical programs, we hereby submit the original Fixed Deposit Receipt bearing the following particulars:\n',
      { lineGap: 3 }
    )

    const boxY = 240
    doc.rect(45, boxY, 505, 160).fillColor('#F8FAFC').fillAndStroke('#E2E8F0')
    const iRows = [
      ['Institution Name:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['AICTE Permanent ID:', '1-10023412'],
      ['Bank & Branch:', 'State Bank of India, Okhla Phase 3 Branch'],
      ['IFSC Code:', 'SBIN0008077'],
      ['FDR / Certificate No:', 'FDR/SBI/2026/DEMO-PASS'],
      ['Account Number:', '1029384756'],
      ['Deposit Amount:', 'Rs. 1,00,00,000  (One Crore Rupees Only)'],
      ['Issue Date & Maturity:', '01/01/2025  to  01/01/2030  (Term: 5 Years)'],
      ['Statutory Lien Status:', 'Lien marked in favour of Member Secretary, AICTE'],
    ]
    let iy = boxY + 12
    for (const [k, v] of iRows) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(k, 55, iy, { width: 170 })
      doc.font('Helvetica').fontSize(9).fillColor('#0F172A').text(v, 230, iy, { width: 310 })
      iy += 16
    }

    doc.font('Helvetica').fontSize(9).fillColor('#1E293B').text(
      '\nWe hereby affirm that this deposit is held jointly with the Member Secretary, AICTE, and an irrevocable lien has been inscribed in the core banking records of State Bank of India. We enclose herewith the Bank Confirmation Letter and the Lien Endorsement Certificate for your official record.\n\n' +
      'We request you to kindly accept and verify this statutory instrument in the Council Registry.',
      45, 420, { lineGap: 3 }
    )

    const sigY = 620
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
    doc.text('Yours faithfully,', 45, sigY)
    doc.text('Dr. Rajesh Sharma', 45, sigY + 35)
    doc.text('Director / Principal', 45, sigY + 48)
    doc.font('Helvetica').fontSize(8).fillColor('#64748B')
    doc.text('IIITM Delhi (PID: 1-10023412) • Official Institutional Seal Affixed', 45, sigY + 62)
  }

  // =========================================================================
  // 5. Test Case: FDR Certificate Amount Mismatch
  // =========================================================================
  const drawFdrCertAmountMismatch = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(2).strokeColor('#DC2626').stroke()
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 40, 50, { align: 'center' })
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text('Commercial Network Branch • Okhla Industrial Area, Phase 3, New Delhi - 110020', { align: 'center' })
    doc.text('IFSC Code: SBIN0008077', { align: 'center' })

    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#DC2626').text('FIXED DEPOSIT RECEIPT [AMOUNT MISMATCH TEST CASE]', { align: 'center' })

    const startY = 140
    doc.rect(45, startY, 505, 300).fillColor('#FEF2F2').fillAndStroke('#FECACA')

    const rows = [
      ['FDR / Receipt Number:', 'FDR/SBI/2026/DEMO-AMT-MISMATCH'],
      ['Deposit Account No:', '1029384756'],
      ['Depositor / Institution Name:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['Joint Account Beneficiary:', 'Member Secretary, All India Council for Technical Education (AICTE)'],
      ['Bank Name & Branch:', 'State Bank of India • Branch: Okhla Phase 3'],
      ['IFSC Code:', 'SBIN0008077'],
      ['Principal Deposit Amount:', 'Rs. 50,00,000  (Fifty Lakh Rupees Only)'],
      ['Annual Interest Rate:', '7.25% per annum'],
      ['Date of Issue / Deposit Date:', '01/01/2025'],
      ['Maturity Date / Due Date:', '01/01/2030'],
    ]

    let curY = startY + 15
    for (const [k, v] of rows) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#991B1B').text(k, 55, curY, { width: 180 })
      doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A').text(v, 240, curY, { width: 300 })
      curY += 25
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#991B1B').text(
      'Lien marked in favour of Member Secretary, AICTE.', 55, 460
    )
  }

  // =========================================================================
  // 6. Test Case: FDR Certificate Name Mismatch
  // =========================================================================
  const drawFdrCertNameMismatch = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(2).strokeColor('#DC2626').stroke()
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 40, 50, { align: 'center' })
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text('Commercial Network Branch • Okhla Industrial Area, Phase 3, New Delhi - 110020', { align: 'center' })
    doc.text('IFSC Code: SBIN0008077', { align: 'center' })

    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#DC2626').text('FIXED DEPOSIT RECEIPT [NAME MISMATCH TEST CASE]', { align: 'center' })

    const startY = 140
    doc.rect(45, startY, 505, 300).fillColor('#FEF2F2').fillAndStroke('#FECACA')

    const rows = [
      ['FDR / Receipt Number:', 'FDR/SBI/2026/DEMO-NAME-MISMATCH'],
      ['Deposit Account No:', '1029384756'],
      ['Depositor / Institution Name:', 'Completely Unrelated Private Corporation Pvt Ltd'],
      ['Joint Account Beneficiary:', 'Member Secretary, All India Council for Technical Education (AICTE)'],
      ['Bank Name & Branch:', 'State Bank of India • Branch: Okhla Phase 3'],
      ['IFSC Code:', 'SBIN0008077'],
      ['Principal Deposit Amount:', 'Rs. 1,00,00,000  (One Crore Rupees Only)'],
      ['Annual Interest Rate:', '7.25% per annum'],
      ['Date of Issue / Deposit Date:', '01/01/2025'],
      ['Maturity Date / Due Date:', '01/01/2030'],
    ]

    let curY = startY + 15
    for (const [k, v] of rows) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#991B1B').text(k, 55, curY, { width: 180 })
      doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A').text(v, 240, curY, { width: 300 })
      curY += 25
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#991B1B').text(
      'Lien marked in favour of Member Secretary, AICTE.', 55, 460
    )
  }

  // =========================================================================
  // 7. Test Case: FDR Certificate Unknown Bank Reference
  // =========================================================================
  const drawFdrCertUnknownRef = (doc: any) => {
    doc.rect(25, 25, 545, 792).lineWidth(2).strokeColor('#D97706').stroke()
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1B3D').text('STATE BANK OF INDIA', 40, 50, { align: 'center' })
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text('Commercial Network Branch • Okhla Industrial Area, Phase 3, New Delhi - 110020', { align: 'center' })
    doc.text('IFSC Code: SBIN0008077', { align: 'center' })

    doc.moveDown(0.8)
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#D97706').text('FIXED DEPOSIT RECEIPT [BANK NOT_FOUND TEST CASE]', { align: 'center' })

    const startY = 140
    doc.rect(45, startY, 505, 300).fillColor('#FFFBEB').fillAndStroke('#FDE68A')

    const rows = [
      ['FDR / Receipt Number:', 'FDR/SBI/2026/UNKNOWN-9999'],
      ['Deposit Account No:', '1029384756'],
      ['Depositor / Institution Name:', '[DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)'],
      ['Joint Account Beneficiary:', 'Member Secretary, All India Council for Technical Education (AICTE)'],
      ['Bank Name & Branch:', 'State Bank of India • Branch: Okhla Phase 3'],
      ['IFSC Code:', 'SBIN0008077'],
      ['Principal Deposit Amount:', 'Rs. 1,00,00,000  (One Crore Rupees Only)'],
      ['Annual Interest Rate:', '7.25% per annum'],
      ['Date of Issue / Deposit Date:', '01/01/2025'],
      ['Maturity Date / Due Date:', '01/01/2030'],
    ]

    let curY = startY + 15
    for (const [k, v] of rows) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#92400E').text(k, 55, curY, { width: 180 })
      doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A').text(v, 240, curY, { width: 300 })
      curY += 25
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#92400E').text(
      'Lien marked in favour of Member Secretary, AICTE.', 55, 460
    )
  }

  // Write files to both demo-documents and public/demo-documents
  const filesToGenerate = [
    { name: '01_FDR_Certificate_PASS.pdf', draw: drawFdrCertPass, sub: '' },
    { name: '02_Bank_Confirmation_Letter_PASS.pdf', draw: drawBankLetterPass, sub: '' },
    { name: '03_Lien_Endorsement_Letter_PASS.pdf', draw: drawLienEndorsementPass, sub: '' },
    { name: '04_Institution_Request_Letter_PASS.pdf', draw: drawInstLetterPass, sub: '' },
    { name: '01_FDR_Certificate_AMOUNT_MISMATCH.pdf', draw: drawFdrCertAmountMismatch, sub: 'test-cases' },
    { name: '02_FDR_Certificate_NAME_MISMATCH.pdf', draw: drawFdrCertNameMismatch, sub: 'test-cases' },
    { name: '03_FDR_Certificate_UNKNOWN_BANK_REF.pdf', draw: drawFdrCertUnknownRef, sub: 'test-cases' },
  ]

  for (const item of filesToGenerate) {
    const dest1 = path.join(DEMO_DIR, item.sub, item.name)
    const dest2 = path.join(PUBLIC_DEMO_DIR, item.sub, item.name)
    await writePdf(dest1, item.draw)
    await writePdf(dest2, item.draw)
    console.log(`Generated: ${item.name} (${item.sub || 'standard'})`)
  }

  console.log('All demo documents successfully generated.')
}

generateAllDemoDocuments().catch((err) => {
  console.error('Error generating demo documents:', err)
  process.exit(1)
})
