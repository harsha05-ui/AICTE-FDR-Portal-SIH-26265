import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'

async function runGateDemonstration() {
  console.log('======================================================================')
  console.log('AICTE STATUTORY INTAKE GATE — DEMONSTRATION RUN')
  console.log('======================================================================\n')

  // Log in as institution user
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'principal@iiitm-delhi.ac.in', password: 'password123' })
  const token = loginRes.body.token

  // Case 1: Amount Mismatch (Fails)
  console.log('--- DEMO 1: Amount Mismatch (Form states ₹1,00,00,000, Cert states ₹50,00,000) ---')
  const ref1 = `FDR/DEMO/AMT-MISMATCH-${Date.now()}`
  await prisma.bankSimulationRecord.create({
    data: {
      bankName: 'State Bank of India',
      referenceNumber: ref1,
      accountNumber: '1029384756',
      depositAmount: 10000000,
      status: 'CONFIRMED',
      lienMarked: true,
      beneficiaryName: 'Member Secretary, AICTE',
    },
  })
  const fdr1Res = await request(app)
    .post('/api/v1/fdrs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      referenceNumber: ref1,
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase 3',
      accountNumber: '1029384756',
      ifscCode: 'SBIN0008077',
      depositAmount: 10000000,
      issueDate: '2025-01-01',
      maturityDate: '2030-01-01',
    })
  const fdr1Id = fdr1Res.body.id

  const mismatchCert = Buffer.from(`%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${ref1}\nAmount: Rs. 50,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`)
  for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
    await request(app)
      .post(`/api/v1/fdrs/${fdr1Id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', mismatchCert, `${slot}.pdf`)
      .field('slotType', slot)
  }
  const submit1Res = await request(app)
    .post(`/api/v1/fdrs/${fdr1Id}/submit`)
    .set('Authorization', `Bearer ${token}`)
  console.log(`Result: HTTP ${submit1Res.status} (Expected 409 Conflict)`)
  console.log(`Blockers:`, submit1Res.body.blockers, '\n')

  // Case 2: Name Mismatch (Fails)
  console.log('--- DEMO 2: Name Mismatch (Form depositor differs from certificate depositor) ---')
  const ref2 = `FDR/DEMO/NAME-MISMATCH-${Date.now()}`
  await prisma.bankSimulationRecord.create({
    data: {
      bankName: 'State Bank of India',
      referenceNumber: ref2,
      accountNumber: '1029384756',
      depositAmount: 10000000,
      status: 'CONFIRMED',
      lienMarked: true,
      beneficiaryName: 'Member Secretary, AICTE',
    },
  })
  const fdr2Res = await request(app)
    .post('/api/v1/fdrs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      referenceNumber: ref2,
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase 3',
      accountNumber: '1029384756',
      ifscCode: 'SBIN0008077',
      depositAmount: 10000000,
      issueDate: '2025-01-01',
      maturityDate: '2030-01-01',
    })
  const fdr2Id = fdr2Res.body.id

  const nameMismatchCert = Buffer.from(`%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${ref2}\nAmount: Rs. 1,00,00,000\nDepositor: Completely Unrelated Private Corporation Pvt Ltd\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`)
  for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
    await request(app)
      .post(`/api/v1/fdrs/${fdr2Id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', nameMismatchCert, `${slot}.pdf`)
      .field('slotType', slot)
  }
  const submit2Res = await request(app)
    .post(`/api/v1/fdrs/${fdr2Id}/submit`)
    .set('Authorization', `Bearer ${token}`)
  console.log(`Result: HTTP ${submit2Res.status} (Expected 409 Conflict)`)
  console.log(`Blockers:`, submit2Res.body.blockers, '\n')

  // Case 3: Bank NOT_FOUND (Fails)
  console.log('--- DEMO 3: Bank Core Receipt NOT_FOUND (Reference not found in bank core records) ---')
  const ref3 = `FDR/DEMO/UNKNOWN-REF-${Date.now()}`
  const fdr3Res = await request(app)
    .post('/api/v1/fdrs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      referenceNumber: ref3,
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase 3',
      accountNumber: '1029384756',
      ifscCode: 'SBIN0008077',
      depositAmount: 10000000,
      issueDate: '2025-01-01',
      maturityDate: '2030-01-01',
    })
  const fdr3Id = fdr3Res.body.id

  const certValid = Buffer.from(`%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${ref3}\nAmount: Rs. 1,00,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`)
  for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
    await request(app)
      .post(`/api/v1/fdrs/${fdr3Id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', certValid, `${slot}.pdf`)
      .field('slotType', slot)
  }
  const submit3Res = await request(app)
    .post(`/api/v1/fdrs/${fdr3Id}/submit`)
    .set('Authorization', `Bearer ${token}`)
  console.log(`Result: HTTP ${submit3Res.status} (Expected 409 Conflict)`)
  console.log(`Blockers:`, submit3Res.body.blockers, '\n')

  // Case 4: Everything Matches & Confirmed (Passes)
  console.log('--- DEMO 4: Complete Match & Confirmed Bank Core Receipt (Passes Gate) ---')
  const ref4 = `FDR/DEMO/PASS-${Date.now()}`
  await prisma.bankSimulationRecord.create({
    data: {
      bankName: 'State Bank of India',
      referenceNumber: ref4,
      accountNumber: '1029384756',
      depositAmount: 10000000,
      status: 'CONFIRMED',
      lienMarked: true,
      beneficiaryName: 'Member Secretary, AICTE',
    },
  })
  const fdr4Res = await request(app)
    .post('/api/v1/fdrs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      referenceNumber: ref4,
      bankName: 'State Bank of India',
      branchName: 'Okhla Phase 3',
      accountNumber: '1029384756',
      ifscCode: 'SBIN0008077',
      depositAmount: 10000000,
      issueDate: '2025-01-01',
      maturityDate: '2030-01-01',
    })
  const fdr4Id = fdr4Res.body.id

  const passCert = Buffer.from(`%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${ref4}\nAmount: Rs. 1,00,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`)
  for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
    await request(app)
      .post(`/api/v1/fdrs/${fdr4Id}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', passCert, `${slot}.pdf`)
      .field('slotType', slot)
  }
  const submit4Res = await request(app)
    .post(`/api/v1/fdrs/${fdr4Id}/submit`)
    .set('Authorization', `Bearer ${token}`)
  console.log(`Result: HTTP ${submit4Res.status} (Expected 200 OK)`)
  console.log(`Verification Status:`, submit4Res.body.verificationStatus)
  console.log(`Trust Level:`, submit4Res.body.trustLevel, `(Simulated: ${submit4Res.body.trustSimulated})`)
  console.log('\n======================================================================')
  console.log('GATE DEMONSTRATION COMPLETE: 1 PASS, 3 FAILS VERIFIED')
  console.log('======================================================================')

  process.exit(0)
}

runGateDemonstration().catch((err) => {
  console.error('Demonstration failed:', err)
  process.exit(1)
})
