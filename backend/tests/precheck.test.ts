import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'
import { setSetting } from '../src/lib/settings'

describe('AICTE Statutory Registry - Pre-Submission Verification Gate', () => {
  let instToken: string
  let reviewerToken: string
  let testInstId: string
  let testUserId: string

  beforeAll(async () => {
    // 1. Authenticate institution user
    const instLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'principal@iiitm-delhi.ac.in', password: 'password123' })
    expect(instLogin.status).toBe(200)
    instToken = instLogin.body.token
    testInstId = instLogin.body.institutionId
    testUserId = instLogin.body.id

    // 2. Authenticate reviewer
    const revLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reviewer@aicte.gov.in', password: 'password123' })
    expect(revLogin.status).toBe(200)
    reviewerToken = revLogin.body.token

    // Set adapter mode to MOCK_DEMO
    await setSetting('verification.adapter_mode', 'MOCK_DEMO', 'Mock bank adapter')
    await setSetting('submission.gate_mode', 'STRICT_BANK_RECEIPT', 'Strict gate mode')
  })

  it('1. Client cannot set check results or trust directly (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: 'FDR/TAMPER/001',
        bankName: 'State Bank of India',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
        trustLevel: 'BANK_CONFIRMED', // Tamper attempt
      })

    expect(res.status).toBe(409)
  })

  it('2. Submit blocked with a missing slot (409 Conflict)', async () => {
    // Create draft FDR
    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: `FDR/SLOT/${Date.now()}`,
        bankName: 'State Bank of India',
        branchName: 'Okhla Phase 3',
        accountNumber: '1029384756',
        ifscCode: 'SBIN0008077',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    // Try submitting without all required slots uploaded
    const submitRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/submit`)
      .set('Authorization', `Bearer ${instToken}`)

    expect(submitRes.status).toBe(409)
    expect(submitRes.body.blockers).toBeDefined()
    expect(submitRes.body.blockers.some((b: string) => b.includes('Missing required document slot'))).toBe(true)
  })

  it('3. Submit blocked when mock bank returns NOT_FOUND (409 Conflict)', async () => {
    const refNum = `FDR/UNKNOWN/${Date.now()}`
    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: refNum,
        bankName: 'State Bank of India',
        branchName: 'Okhla Phase 3',
        accountNumber: '1029384756',
        ifscCode: 'SBIN0008077',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    // Upload required slots with matching text in certificate
    const certText = `%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${refNum}\nAmount: Rs. 1,00,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`
    const certPdf = Buffer.from(certText)

    await request(app)
      .post(`/api/v1/fdrs/${fdrId}/documents`)
      .set('Authorization', `Bearer ${instToken}`)
      .attach('file', certPdf, 'certificate.pdf')
      .field('slotType', 'FDR_CERTIFICATE')

    await request(app)
      .post(`/api/v1/fdrs/${fdrId}/documents`)
      .set('Authorization', `Bearer ${instToken}`)
      .attach('file', certPdf, 'confirmation.pdf')
      .field('slotType', 'BANK_CONFIRMATION_LETTER')

    await request(app)
      .post(`/api/v1/fdrs/${fdrId}/documents`)
      .set('Authorization', `Bearer ${instToken}`)
      .attach('file', certPdf, 'lien.pdf')
      .field('slotType', 'LIEN_ENDORSEMENT')

    await request(app)
      .post(`/api/v1/fdrs/${fdrId}/documents`)
      .set('Authorization', `Bearer ${instToken}`)
      .attach('file', certPdf, 'request.pdf')
      .field('slotType', 'INSTITUTION_REQUEST_LETTER')

    // Submit -> refNum not in BankSimulationRecord -> bank returns NOT_FOUND -> blocked with 409
    const submitRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/submit`)
      .set('Authorization', `Bearer ${instToken}`)

    expect(submitRes.status).toBe(409)
    expect(submitRes.body.blockers.some((b: string) => b.includes('Bank receipt confirmation required'))).toBe(true)
  }, 15000)

  it('4. Submit blocked with amount mismatch between certificate and form (409 Conflict)', async () => {
    const refNum = `FDR/SBI/2026/DEMO-MIS-${Date.now()}`
    await prisma.bankSimulationRecord.create({
      data: {
        bankName: 'State Bank of India',
        referenceNumber: refNum,
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
    })
    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: refNum,
        bankName: 'State Bank of India',
        branchName: 'Main Branch',
        accountNumber: '1029384756',
        ifscCode: 'SBIN0008077',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    // Upload certificate stating Rs. 50,00,000 (mismatch against 10000000)
    const mismatchCert = Buffer.from(`%PDF-1.4\nState Bank of India\nBranch: Main Branch\nFDR No: ${refNum}\nAmount: Rs. 50,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`)

    for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
      await request(app)
        .post(`/api/v1/fdrs/${fdrId}/documents`)
        .set('Authorization', `Bearer ${instToken}`)
        .attach('file', mismatchCert, `${slot}.pdf`)
        .field('slotType', slot)
    }

    const submitRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/submit`)
      .set('Authorization', `Bearer ${instToken}`)

    expect(submitRes.status).toBe(409)
    expect(submitRes.body.blockers.some((b: string) => b.includes('Deposit Amount'))).toBe(true)
  }, 15000)

  it('5. Submit allowed when everything matches and mock bank confirms (trustSimulated=true)', async () => {
    const refNum = `FDR/SBI/2026/PASS-${Date.now()}`

    // Seed matching bank simulation record
    await prisma.bankSimulationRecord.create({
      data: {
        bankName: 'State Bank of India',
        referenceNumber: refNum,
        accountNumber: '1029384756',
        depositAmount: 10000000,
        status: 'CONFIRMED',
        lienMarked: true,
        beneficiaryName: 'Member Secretary, AICTE',
      },
    })

    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: refNum,
        bankName: 'State Bank of India',
        branchName: 'Okhla Phase 3',
        accountNumber: '1029384756',
        ifscCode: 'SBIN0008077',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    const validText = `%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${refNum}\nAmount: Rs. 1,00,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`
    const validPdf = Buffer.from(validText)

    for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
      await request(app)
        .post(`/api/v1/fdrs/${fdrId}/documents`)
        .set('Authorization', `Bearer ${instToken}`)
        .attach('file', validPdf, `${slot}.pdf`)
        .field('slotType', slot)
    }

    // Submit passes gate!
    const submitRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/submit`)
      .set('Authorization', `Bearer ${instToken}`)

    if (submitRes.status !== 200) {
      console.log('TEST 5 BLOCKERS:', submitRes.body)
    }

    expect(submitRes.status).toBe(200)
    expect(submitRes.body.verificationStatus).toBe('SUBMITTED')
    expect(submitRes.body.trustLevel).toBe('BANK_CONFIRMED')
    expect(submitRes.body.trustSimulated).toBe(true)

    // Replacing a document invalidates checks and resets trust to SUBMITTED
    const replaceRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/documents`)
      .set('Authorization', `Bearer ${instToken}`)
      .attach('file', validPdf, 'replacement.pdf')
      .field('slotType', 'FDR_CERTIFICATE')
    expect(replaceRes.status).toBe(201)

    const fdrAfterReplace = await prisma.fDR.findUnique({ where: { id: fdrId } })
    expect(fdrAfterReplace?.trustLevel).toBe('SUBMITTED')
    expect(fdrAfterReplace?.trustSimulated).toBe(false)
  }, 15000)

  it('6. DOCUMENT_ONLY mode allows submission without bank receipt and keeps trust at SUBMITTED', async () => {
    // Switch setting to DOCUMENT_ONLY
    await setSetting('submission.gate_mode', 'DOCUMENT_ONLY', 'Document only mode')

    const refNum = `FDR/DOCONLY/${Date.now()}`
    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        referenceNumber: refNum,
        bankName: 'State Bank of India',
        branchName: 'Okhla Phase 3',
        accountNumber: '1029384756',
        ifscCode: 'SBIN0008077',
        depositAmount: 10000000,
        issueDate: '2025-01-01',
        maturityDate: '2030-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    const validText = `%PDF-1.4\nState Bank of India\nBranch: Okhla Phase 3\nIFSC: SBIN0008077\nFDR No: ${refNum}\nAmount: Rs. 1,00,00,000\nDepositor: [DEMO] Indraprastha Institute of Information Technology & Management (IIITM Delhi)\nDate of Issue: 01/01/2025\nMaturity Date: 01/01/2030\nLien marked in favour of Member Secretary, AICTE\n%%EOF`
    const validPdf = Buffer.from(validText)

    for (const slot of ['FDR_CERTIFICATE', 'BANK_CONFIRMATION_LETTER', 'LIEN_ENDORSEMENT', 'INSTITUTION_REQUEST_LETTER']) {
      await request(app)
        .post(`/api/v1/fdrs/${fdrId}/documents`)
        .set('Authorization', `Bearer ${instToken}`)
        .attach('file', validPdf, `${slot}.pdf`)
        .field('slotType', slot)
    }

    // Submit in DOCUMENT_ONLY mode
    const submitRes = await request(app)
      .post(`/api/v1/fdrs/${fdrId}/submit`)
      .set('Authorization', `Bearer ${instToken}`)

    expect(submitRes.status).toBe(200)
    expect(submitRes.body.verificationStatus).toBe('SUBMITTED')
    expect(submitRes.body.trustLevel).toBe('SUBMITTED')
    expect(submitRes.body.trustSimulated).toBe(false)

    // Reset setting back to STRICT_BANK_RECEIPT
    await setSetting('submission.gate_mode', 'STRICT_BANK_RECEIPT', 'Strict gate mode')
  }, 15000)
})
