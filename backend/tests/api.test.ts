import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/lib/prisma'
import { runMaturityAndNotificationCheck } from '../src/lib/maturityJob'
import { signAccessToken } from '../src/middleware/auth'
import { validateProductionSecrets } from '../src/config'
import { setBankAdapterOverride } from '../src/integrations/bankVerification'
import { runDiscrepancyRules } from '../src/lib/rules'
import { getSetting } from '../src/lib/settings'

describe('AICTE Backend Statutory Registry - Sprint Verification', () => {
  let inst1Token: string
  let inst2Token: string
  let reviewerToken: string
  let approverToken: string
  let adminToken: string
  let test23ReleaseId: string

  let inst1User: any
  let inst2User: any
  let reviewerUser: any
  let approverUser: any
  let adminUser: any

  beforeAll(async () => {
    inst1User = await prisma.user.findUnique({ where: { email: 'principal@iiitm-delhi.ac.in' } })
    inst2User = await prisma.user.findUnique({ where: { email: 'registrar@vjti-mumbai.edu.in' } })
    reviewerUser = await prisma.user.findUnique({ where: { email: 'reviewer@aicte.gov.in' } })
    approverUser = await prisma.user.findUnique({ where: { email: 'approver@aicte.gov.in' } })
    adminUser = await prisma.user.findUnique({ where: { email: 'admin@aicte.gov.in' } })

    inst1Token = signAccessToken(inst1User)
    inst2Token = signAccessToken(inst2User)
    reviewerToken = signAccessToken(reviewerUser)
    approverToken = signAccessToken(approverUser)
    adminToken = signAccessToken(adminUser)

    await prisma.hold.deleteMany({
      where: { referenceNo: 'CBI/ACB/2026/09' },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('1. No token -> 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/fdrs')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('2. Wrong role -> 403 Forbidden', async () => {
    // Institution user attempting admin-only POST /institutions
    const res = await request(app)
      .post('/api/v1/institutions')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        institutionCode: '1-99999999',
        name: 'Unauthorized Institution',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')

    // Institution user attempting admin/reviewer-only GET /audit-logs
    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${inst1Token}`)

    expect(auditRes.status).toBe(403)
  })

  it("3. Institution A cannot read Institution B's FDR", async () => {
    // Inst 1 User tries to read FDR belonging to Inst 2 (fdr-maturing-30d)
    const res = await request(app)
      .get('/api/v1/fdrs/fdr-maturing-30d')
      .set('Authorization', `Bearer ${inst1Token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.message).toContain('another institution')
  })

  it('4. Invalid transition -> 409 Conflict', async () => {
    // Reviewer attempts to verify fdr-longterm-active which is already VERIFIED
    const res = await request(app)
      .post('/api/v1/fdrs/fdr-longterm-active/verify')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        result: 'VERIFIED',
        remarks: 'Invalid transition test',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('5. Duplicate bank+ref -> 409 Conflict', async () => {
    // Attempt to create duplicate of existing State Bank of India instrument
    const res = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        bankName: 'State Bank of India',
        referenceNumber: 'FDR/SBI/2021/77190',
        depositAmount: 5000000,
        issueDate: '2026-01-01',
        maturityDate: '2031-01-01',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
  })

  it('6. Renewal creates a linked FDR', async () => {
    // 1. Institution creates renewal request for an instrument
    const renewReq = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-7d/renewals')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        type: 'RENEWAL',
        proposedAmount: 10000000,
        justification: 'Automated 5-year extension test',
      })

    expect(renewReq.status).toBe(201)
    const renewalId = renewReq.body.id

    // 2. Approver approves the renewal
    const decisionRes = await request(app)
      .post(`/api/v1/renewals/${renewalId}/decision`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        decision: 'APPROVED',
        remarks: 'Renewal sanctioned by competent authority.',
      })

    expect(decisionRes.status).toBe(200)
    expect(decisionRes.body.status).toBe('APPROVED')
    expect(decisionRes.body.replacementFdrId).toBeDefined()

    // 3. Verify the linked instrument exists in DB with SUBMITTED status
    const linkedFdr = await prisma.fDR.findUnique({
      where: { id: decisionRes.body.replacementFdrId },
    })
    expect(linkedFdr).toBeDefined()
    expect(linkedFdr?.verificationStatus).toBe('SUBMITTED')
    expect(linkedFdr?.previousFdrId).toBe('fdr-maturing-7d')

    // 4. Verify old instrument is marked RENEWED
    const oldFdr = await prisma.fDR.findUnique({
      where: { id: 'fdr-maturing-7d' },
    })
    expect(oldFdr?.lifecycleStatus).toBe('RENEWED')
  })

  it('7. Release blocked with an open discrepancy', async () => {
    // fdr-open-discrepancy has DISCREPANCY status and high risk flags
    const res = await request(app)
      .post('/api/v1/fdrs/fdr-open-discrepancy/release-requests')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({
        reason: 'Attempt release with open discrepancy',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(res.body.error.message).toContain('Demo Rule Violation')
  })

  it('8. Reminders not duplicated on a second cron run', async () => {
    // Run cron check once
    const firstRun = await runMaturityAndNotificationCheck()
    const firstCount = await prisma.notification.count()

    // Run cron check a second time
    const secondRun = await runMaturityAndNotificationCheck()
    const secondCount = await prisma.notification.count()

    // Zero new reminders should be created on the second run due to dedup
    expect(secondRun.remindersGenerated).toBe(0)
    expect(secondCount).toBe(firstCount)
  }, 15000)

  it('9. Encrypted file round-trips on download', async () => {
    const rawPdfContent = '%PDF-1.4\nTest encrypted content for AICTE verification.\n%%EOF'
    const pdfBuffer = Buffer.from(rawPdfContent)

    // 1. Upload encrypted document
    const uploadRes = await request(app)
      .post('/api/v1/fdrs/fdr-submitted-awaiting/documents')
      .set('Authorization', `Bearer ${inst1Token}`)
      .attach('file', pdfBuffer, 'statutory_certificate.pdf')
      .field('documentType', 'FDR_CERTIFICATE')

    expect(uploadRes.status).toBe(201)
    const docId = uploadRes.body.id

    // 2. Download and decrypt document
    const downloadRes = await request(app)
      .get(`/api/v1/documents/${docId}/download`)
      .set('Authorization', `Bearer ${inst1Token}`)

    expect(downloadRes.status).toBe(200)
    expect(downloadRes.headers['content-type']).toContain('application/pdf')
    expect(downloadRes.body.toString()).toBe(rawPdfContent)
  })

  it('10. POST /auth/login returns JWT token and sanitized profile', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'principal@iiitm-delhi.ac.in', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.email).toBe('principal@iiitm-delhi.ac.in')
    expect(res.body.role).toBe('INSTITUTION_USER')
  })

  it('11. GET /dashboard/summary returns computed metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${reviewerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.countsByLifecycle).toBeDefined()
    expect(res.body.metrics).toBeDefined()
    expect(typeof res.body.metrics.avgVerificationHours).toBe('number')
    expect(typeof res.body.metrics.discrepanciesFlaggedCount).toBe('number')
  })

  it('12. GET /reports/fdrs supports JSON and CSV export with audit logging', async () => {
    const jsonRes = await request(app)
      .get('/api/v1/reports/fdrs?type=all&format=json')
      .set('Authorization', `Bearer ${reviewerToken}`)

    expect(jsonRes.status).toBe(200)
    expect(Array.isArray(jsonRes.body.data)).toBe(true)

    const csvRes = await request(app)
      .get('/api/v1/reports/fdrs?type=all&format=csv')
      .set('Authorization', `Bearer ${reviewerToken}`)

    expect(csvRes.status).toBe(200)
    expect(csvRes.headers['content-type']).toContain('text/csv')
    expect(csvRes.text).toContain('FDR Number,Institution Code')
  })

  it('13. Notification IDOR: Users cannot mark others’ notifications as read (returns 404)', async () => {
    // Fetch a notification belonging to inst1User
    const inst1Notif = await prisma.notification.findFirst({
      where: { userId: inst1User.id },
    })
    expect(inst1Notif).toBeDefined()

    // inst2User attempts to mark inst1User's notification as read
    const idorRes = await request(app)
      .post(`/api/v1/notifications/${inst1Notif!.id}/read`)
      .set('Authorization', `Bearer ${inst2Token}`)

    expect(idorRes.status).toBe(404)
    expect(idorRes.body.error.code).toBe('NOT_FOUND')

    // inst1User can successfully mark their own notification as read
    const ownRes = await request(app)
      .post(`/api/v1/notifications/${inst1Notif!.id}/read`)
      .set('Authorization', `Bearer ${inst1Token}`)

    expect(ownRes.status).toBe(200)
    expect(ownRes.body.success).toBe(true)
  })

  it('14. Production secret validation: startup fails if secrets are demo or short', () => {
    // Test with demo/short secrets
    const insecureCheck = validateProductionSecrets({
      JWT_SECRET: 'dev_demo_key_short',
      JWT_REFRESH_SECRET: 'aicte_statutory_portal_refresh_secret_2026',
      SESSION_COOKIE_SECRET: 'aicte_secure_cookie_secret_2026',
      FILE_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    })

    expect(insecureCheck.isValid).toBe(false)
    expect(insecureCheck.errors.length).toBeGreaterThan(0)

    // Test with secure, production-grade secrets
    const secureCheck = validateProductionSecrets({
      JWT_SECRET: 'master_super_secure_production_jwt_secret_key_2026_xyz',
      JWT_REFRESH_SECRET: 'master_super_secure_production_refresh_token_secret_key_2026_xyz',
      SESSION_COOKIE_SECRET: 'master_super_secure_production_cookie_session_secret_2026_xyz',
      FILE_ENC_KEY: 'e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3',
    })

    expect(secureCheck.isValid).toBe(true)
    expect(secureCheck.errors.length).toBe(0)
  })

  it('15. Computed daysToMaturity is included in all FDR responses', async () => {
    const res = await request(app)
      .get('/api/v1/fdrs/fdr-maturing-7d')
      .set('Authorization', `Bearer ${inst1Token}`)

    expect(res.status).toBe(200)
    expect(res.body.daysToMaturity).toBeDefined()
    expect(typeof res.body.daysToMaturity).toBe('number')
  })

  it('16. Zod validation blocks client status tampering and non-positive amounts', async () => {
    // Attempting to set verificationStatus directly -> 409 Conflict
    const tamperingRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        bankName: 'HDFC Bank',
        referenceNumber: 'FDR/TAMPER/2026/01',
        depositAmount: 5000000,
        issueDate: '2026-01-01',
        maturityDate: '2031-01-01',
        verificationStatus: 'VERIFIED',
      })

    expect(tamperingRes.status).toBe(409)

    // Attempting non-positive amount -> 400 Bad Request
    const negativeRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        bankName: 'HDFC Bank',
        referenceNumber: 'FDR/INVALID/2026/02',
        depositAmount: -1000,
        issueDate: '2026-01-01',
        maturityDate: '2031-01-01',
      })

    expect(negativeRes.status).toBe(400)
  })

  it('17. Client cannot set trustLevel, trustSimulated, or lienStatus directly on creation or patch', async () => {
    // Direct attempt on creation
    const resCreate = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        bankName: 'Axis Bank',
        referenceNumber: 'FDR/TAMPER/TRUST/01',
        depositAmount: 5000000,
        issueDate: '2026-01-01',
        maturityDate: '2031-01-01',
        trustLevel: 'BANK_CONFIRMED',
      })
    expect(resCreate.status).toBe(409)

    // Direct attempt on patch
    const resPatch = await request(app)
      .patch('/api/v1/fdrs/fdr-maturing-7d')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        trustLevel: 'BANK_CONFIRMED',
      })
    expect(resPatch.status).toBe(409)
  })

  it('18. Manual mode (default) bank-verify returns NOT_INTEGRATED and never sets BANK_CONFIRMED', async () => {
    // Ensure initial trust is SUBMITTED
    await prisma.fDR.update({
      where: { id: 'fdr-maturing-7d' },
      data: { trustLevel: 'SUBMITTED', trustSimulated: false },
    })

    setBankAdapterOverride('MANUAL')
    const res = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-7d/bank-verify')
      .set('Authorization', `Bearer ${reviewerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.verificationResult).toBeDefined()
    expect(res.body.verificationResult.status).toBe('NOT_INTEGRATED')
    expect(res.body.verificationResult.simulated).toBe(false)
    expect(res.body.trustLevel).toBe('SUBMITTED')
  })

  it('19. MockBankAdapter sets BANK_CONFIRMED with trustSimulated = true and lien confirmed', async () => {
    setBankAdapterOverride('MOCK_DEMO')
    const res = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-7d/bank-verify')
      .set('Authorization', `Bearer ${reviewerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.verificationResult).toBeDefined()
    expect(res.body.verificationResult.status).toBe('CONFIRMED')
    expect(res.body.verificationResult.simulated).toBe(true)
    expect(res.body.trustLevel).toBe('BANK_CONFIRMED')
    expect(res.body.trustSimulated).toBe(true)
    expect(res.body.lienStatus).toBe('CONFIRMED_BY_BANK')

    // Reset override
    setBankAdapterOverride(null)
  })

  it('20. Key-field edit via PATCH resets trustLevel to SUBMITTED', async () => {
    // 1. Create a draft instrument with a unique reference
    const uniqueRef = `FDR/TEST/RESET/${Date.now()}`
    const createRes = await request(app)
      .post('/api/v1/fdrs')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        bankName: 'State Bank of India',
        referenceNumber: uniqueRef,
        depositAmount: 5000000,
        issueDate: '2026-01-01',
        maturityDate: '2031-01-01',
      })
    expect(createRes.status).toBe(201)
    const fdrId = createRes.body.id

    // 2. Set trustLevel to STAFF_VERIFIED in DB
    await prisma.fDR.update({
      where: { id: fdrId },
      data: { trustLevel: 'STAFF_VERIFIED', trustSimulated: false },
    })

    // 3. Edit key field (depositAmount)
    const patchRes = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}`)
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        depositAmount: 6000000,
      })

    expect(patchRes.status).toBe(200)
    expect(patchRes.body.trustLevel).toBe('SUBMITTED')
    expect(patchRes.body.trustSimulated).toBe(false)
    expect(patchRes.body.depositAmount).toBe(6000000)
  })

  it('21. PATCH /fdrs/:id/lien enforces role limits and honesty rule', async () => {
    const fdrId = 'fdr-maturing-7d'

    // 1. Institution user cannot set CONFIRMED_BY_STAFF -> 403 Forbidden
    const instAttemptStaff = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}/lien`)
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({ lienStatus: 'CONFIRMED_BY_STAFF' })
    expect(instAttemptStaff.status).toBe(403)

    // 2. Institution user cannot set CONFIRMED_BY_BANK -> 403 Forbidden
    const instAttemptBank = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}/lien`)
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({ lienStatus: 'CONFIRMED_BY_BANK' })
    expect(instAttemptBank.status).toBe(403)

    // 3. Institution user can set CLAIMED_BY_INSTITUTION -> 200 OK
    const instClaim = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}/lien`)
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        lienStatus: 'CLAIMED_BY_INSTITUTION',
        lienNote: 'Lien marked in favour of Member Secretary AICTE per institute board resolution.',
      })
    expect(instClaim.status).toBe(200)
    expect(instClaim.body.lienStatus).toBe('CLAIMED_BY_INSTITUTION')
    expect(instClaim.body.lienNote).toBe('Lien marked in favour of Member Secretary AICTE per institute board resolution.')

    // 4. Staff reviewer can set CONFIRMED_BY_STAFF -> 200 OK with confirmed details
    const staffConfirm = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}/lien`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        lienStatus: 'CONFIRMED_BY_STAFF',
        lienNote: 'Physically verified bank lien certificate matching AICTE format.',
      })
    expect(staffConfirm.status).toBe(200)
    expect(staffConfirm.body.lienStatus).toBe('CONFIRMED_BY_STAFF')
    expect(staffConfirm.body.lienConfirmedById).toBe(reviewerUser.id)
    expect(staffConfirm.body.lienConfirmedAt).toBeDefined()

    // 5. Staff reviewer cannot directly set CONFIRMED_BY_BANK (only adapter can) -> 403 Forbidden
    const staffAttemptBank = await request(app)
      .patch(`/api/v1/fdrs/${fdrId}/lien`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ lienStatus: 'CONFIRMED_BY_BANK' })
    expect(staffAttemptBank.status).toBe(403)
  })

  it('22. Active hold blocks release request creation; clearing without remarks fails; clearing succeeds', async () => {
    // 1. Place hold on inst-1
    const holdRes = await request(app)
      .post('/api/v1/institutions/inst-1/holds')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        reason: 'Statutory compliance inspection pending by Vigilance Directorate',
        sourceBody: 'AICTE Vigilance Bureau',
        referenceNo: 'AICTE/VIG/HOLD/2026/01',
      })
    expect(holdRes.status).toBe(201)
    const holdId = holdRes.body.id

    // 2. Attempt to create release request on inst-1's verified instrument -> blocked 409
    const blockedRes = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-7d/release-requests')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        reason: 'Attempt release while active hold exists',
      })
    expect(blockedRes.status).toBe(409)
    expect(blockedRes.body.error.message).toContain('active regulatory hold')

    // 3. Attempting to clear hold without remarks -> 400 Bad Request
    const failClear = await request(app)
      .post(`/api/v1/holds/${holdId}/clear`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({})
    expect(failClear.status).toBe(400)

    // 4. Clear hold with remarks -> 200 OK
    const clearRes = await request(app)
      .post(`/api/v1/holds/${holdId}/clear`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ clearRemarks: 'Vigilance audit completed and cleared by Bureau Head.' })
    expect(clearRes.status).toBe(200)
    expect(clearRes.body.active).toBe(false)
    expect(clearRes.body.clearedBy).toBe(approverUser.id)
  })

  it('23. Multi-office release passes 5 stages; wrong-office blocked; completing final stage releases FDR', async () => {
    // Ensure fdr-maturing-7d is VERIFIED and has no flags
    await prisma.fDR.update({
      where: { id: 'fdr-maturing-7d' },
      data: { verificationStatus: 'VERIFIED', lifecycleStatus: 'ACTIVE', flags: '[]' },
    })

    // 1. Create release request
    const createRel = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-7d/release-requests')
      .set('Authorization', `Bearer ${inst1Token}`)
      .send({
        reason: 'Successful completion of academic cycle',
      })
    expect(createRel.status).toBe(201)
    const releaseId = createRel.body.id
    test23ReleaseId = releaseId

    // Fetch release details with stages
    const getRel = await request(app)
      .get(`/api/v1/release-requests/${releaseId}`)
      .set('Authorization', `Bearer ${inst1Token}`)
    expect(getRel.status).toBe(200)
    expect(getRel.body.stages.length).toBe(5)
    expect(getRel.body.stages[0].office).toBe('REGIONAL_OFFICE')
    expect(getRel.body.stages[0].status).toBe('ACTIVE')
    expect(getRel.body.stages[1].status).toBe('PENDING')

    const stage0 = getRel.body.stages[0]
    const stage1 = getRel.body.stages[1]

    // 2. Reviewer from REGIONAL_OFFICE attempts to act on stage 1 (APPROVAL_BUREAU) -> 409 (not active)
    const wrongStageAct = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage1.id}/action`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ action: 'APPROVE', remarks: 'Trying to act ahead' })
    expect(wrongStageAct.status).toBe(409)

    // 3. Reviewer acts on Stage 0 (REGIONAL_OFFICE) -> 200 OK, advances to Stage 1
    const actStage0 = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage0.id}/action`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ action: 'APPROVE', remarks: 'Regional office compliance verified' })
    expect(actStage0.status).toBe(200)
    expect(actStage0.body.stageStatus).toBe('APPROVED')
    expect(actStage0.body.requestStatus).toBe('UNDER_REVIEW')

    // 4. Now stage 1 is ACTIVE. Reviewer (REGIONAL_OFFICE) attempts to act on Stage 1 (APPROVAL_BUREAU) -> 403 Forbidden!
    const wrongOfficeAct = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage1.id}/action`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ action: 'APPROVE', remarks: 'Regional reviewer acting on approval bureau' })
    expect(wrongOfficeAct.status).toBe(403)
    expect(wrongOfficeAct.body.error.message).toContain('cannot act on stage')

    // 5. Approver (APPROVAL_BUREAU) approves Stage 1
    const actStage1 = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage1.id}/action`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ action: 'APPROVE', remarks: 'Approval bureau clearance granted' })
    expect(actStage1.status).toBe(200)

    // 6. Admin can act across all stages: Admin approves Stage 2, 3, 4
    const relAfterStage1 = await request(app)
      .get(`/api/v1/release-requests/${releaseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    const stage2 = relAfterStage1.body.stages[2]
    const stage3 = relAfterStage1.body.stages[3]
    const stage4 = relAfterStage1.body.stages[4]

    // Approve Stage 2 (GRIEVANCE_CELL)
    const actStage2 = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage2.id}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', remarks: 'No pending student grievances recorded' })
    expect(actStage2.status).toBe(200)

    // Approve Stage 3 (VIGILANCE_CELL)
    const actStage3 = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage3.id}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', remarks: 'Vigilance clearance affirmed' })
    expect(actStage3.status).toBe(200)

    // Approve Stage 4 (Final Stage: COMPETENT_AUTHORITY)
    const actStage4 = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage4.id}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', remarks: 'Competent Authority sanctions final release' })
    expect(actStage4.status).toBe(200)
    expect(actStage4.body.requestStatus).toBe('APPROVED')
    expect(actStage4.body.completed).toBe(true)

    // Verify instrument lifecycleStatus is RELEASED
    const updatedFdr = await prisma.fDR.findUnique({ where: { id: 'fdr-maturing-7d' } })
    expect(updatedFdr?.lifecycleStatus).toBe('RELEASED')
  }, 15000)

  it('24. Stage REJECT declines request and Stage RETURN sends back to institution', async () => {
    // 1. Test REJECT
    await prisma.fDR.update({
      where: { id: 'fdr-maturing-30d' },
      data: { verificationStatus: 'VERIFIED', lifecycleStatus: 'ACTIVE', flags: '[]' },
    })

    const relRes = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-30d/release-requests')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ reason: 'Graduation release request' })
    expect(relRes.status).toBe(201)
    const releaseId = relRes.body.id
    const stage0Id = relRes.body.stages[0].id

    const rejectRes = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stage0Id}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'REJECT', remarks: 'Statutory lock-in duration not met' })
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.body.requestStatus).toBe('DECLINED')
    expect(rejectRes.body.stageStatus).toBe('REJECTED')

    // 2. Test RETURN
    const relRes2 = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-30d/release-requests')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ reason: 'Re-attempted release request' })
    expect(relRes2.status).toBe(201)
    const releaseId2 = relRes2.body.id
    const stage0Id2 = relRes2.body.stages[0].id

    const returnRes = await request(app)
      .post(`/api/v1/release-requests/${releaseId2}/stages/${stage0Id2}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'RETURN', remarks: 'Please upload updated syndicate resolution' })
    expect(returnRes.status).toBe(200)
    expect(returnRes.body.requestStatus).toBe('RETURNED')
    expect(returnRes.body.stageStatus).toBe('RETURNED')
  })

  it('25. Active hold placed mid-workflow blocks final stage approval', async () => {
    await prisma.fDR.update({
      where: { id: 'fdr-maturing-30d' },
      data: { verificationStatus: 'VERIFIED', lifecycleStatus: 'ACTIVE', flags: '[]' },
    })

    // Clear any existing hold on inst-2 to test clean creation
    await prisma.hold.updateMany({
      where: { institutionId: 'inst-2' },
      data: { active: false, clearRemarks: 'Cleared for test' },
    })

    // Create release request for inst2
    const relRes = await request(app)
      .post('/api/v1/fdrs/fdr-maturing-30d/release-requests')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ reason: 'Release for inst2' })
    expect(relRes.status).toBe(201)
    const releaseId = relRes.body.id
    const stages = relRes.body.stages

    // Progress through stages 0 to 3
    for (let i = 0; i < 4; i++) {
      const act = await request(app)
        .post(`/api/v1/release-requests/${releaseId}/stages/${stages[i].id}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE', remarks: `Stage ${i} approved` })
      expect(act.status).toBe(200)
    }

    // Now place a new hold on inst-2 before final stage approval
    const newHold = await request(app)
      .post('/api/v1/institutions/inst-2/holds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'New inquiry raised by CBI',
        sourceBody: 'Central Bureau of Investigation',
        referenceNo: 'CBI/ACB/2026/09',
      })
    expect(newHold.status).toBe(201)

    // Attempt final stage approval -> blocked by active hold!
    const finalBlocked = await request(app)
      .post(`/api/v1/release-requests/${releaseId}/stages/${stages[4].id}/action`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', remarks: 'Attempt final sanction' })
    expect(finalBlocked.status).toBe(409)
    expect(finalBlocked.body.error.message).toContain('active regulatory hold')

    // Clean up test hold so subsequent test runs / tests on inst-2 are not polluted
    await prisma.hold.deleteMany({
      where: { referenceNo: 'CBI/ACB/2026/09' },
    })
  }, 15000)

  it('26. Final release approval generates IssuedOrder and GET /release-requests/:id/order returns decrypted PDF', async () => {
    // Release from Test 23 was on fdr-maturing-7d
    const rel = await prisma.releaseRequest.findUnique({
      where: { id: test23ReleaseId },
      include: { issuedOrder: true },
    })
    expect(rel).toBeTruthy()
    expect(rel?.issuedOrder).toBeTruthy()
    expect(rel?.issuedOrder?.referenceNo).toMatch(/^NOC\/DEMO\/\d{4}\/\d{4}$/)

    // Authorized download by inst1
    const pdfRes = await request(app)
      .get(`/api/v1/release-requests/${rel!.id}/order`)
      .set('Authorization', `Bearer ${inst1Token}`)
    expect(pdfRes.status).toBe(200)
    expect(pdfRes.headers['content-type']).toBe('application/pdf')
    expect(pdfRes.body.toString().slice(0, 4)).toBe('%PDF')

    // Unauthorized download by inst2 -> 403 Forbidden
    const unauthPdf = await request(app)
      .get(`/api/v1/release-requests/${rel!.id}/order`)
      .set('Authorization', `Bearer ${inst2Token}`)
    expect(unauthPdf.status).toBe(403)
  })

  it('27. Settings management: staff cannot write settings; Admin updates setting and cache invalidates', async () => {
    // Reviewer attempts write -> 403
    const staffWrite = await request(app)
      .put('/api/v1/settings/reminders.thresholds_days')
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ value: [45, 10, 0] })
    expect(staffWrite.status).toBe(403)

    // Admin updates setting -> 200
    const adminWrite = await request(app)
      .put('/api/v1/settings/reminders.thresholds_days')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: [45, 10, 0], description: 'Updated test alert thresholds' })
    expect(adminWrite.status).toBe(200)
    expect(adminWrite.body.value).toEqual([45, 10, 0])

    // Verify setting is cached / retrieved correctly
    const val = await getSetting<number[]>('reminders.thresholds_days', [])
    expect(val).toEqual([45, 10, 0])

    // Restore to default
    await request(app)
      .put('/api/v1/settings/reminders.thresholds_days')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: [90, 60, 30, 15, 7, 0] })
  })

  it('28. Maturity job is idempotent across multiple runs', async () => {
    const run1 = await runMaturityAndNotificationCheck()
    expect(run1).toBeDefined()
    expect(typeof run1.instrumentsChecked).toBe('number')

    // Running a second time on the same state produces zero duplicates
    const run2 = await runMaturityAndNotificationCheck()
    expect(run2.remindersGenerated).toBe(0)
    expect(run2.stageEscalationsCount).toBe(0)
  })

  it('29. Extra discrepancy rules flag amounts below category requirement and unconfirmed lien', async () => {
    // Set low amount to trigger AMOUNT_BELOW_CATEGORY_REQUIREMENT
    await prisma.fDR.update({
      where: { id: 'fdr-replacement-chain-old' },
      data: { depositAmount: 500000, lienStatus: 'NOT_RECORDED' },
    })
    const result = await runDiscrepancyRules('fdr-replacement-chain-old')
    expect(result.flags).toContain('LIEN_NOT_CONFIRMED')
    expect(result.flags).toContain('AMOUNT_BELOW_CATEGORY_REQUIREMENT')
    expect(result.riskLevel).toBe('HIGH')
  })

  it('30. Signed download URL: valid 5 minutes; unauthenticated download succeeds; forged/expired fails', async () => {
    // 1. Inst 1 requests signed download URL for their certificate
    const doc = await prisma.document.findFirst({
      where: { fdrId: 'fdr-maturing-7d' },
    })
    expect(doc).toBeTruthy()

    const urlRes = await request(app)
      .get(`/api/v1/documents/${doc!.id}/download-url`)
      .set('Authorization', `Bearer ${inst1Token}`)
    expect(urlRes.status).toBe(200)
    expect(urlRes.body.downloadUrl).toContain('/download?expires=')
    expect(urlRes.body.validSeconds).toBe(300)

    // 2. Fetch using signed URL without any Bearer token -> 200 OK
    const rawDownload = await request(app).get(urlRes.body.downloadUrl)
    expect(rawDownload.status).toBe(200)
    expect(rawDownload.headers['content-type']).toBe('application/pdf')

    // 3. Tampered signature -> 403 Forbidden
    const tamperedUrl = `${urlRes.body.downloadUrl}tampered`
    const tamperedRes = await request(app).get(tamperedUrl)
    expect(tamperedRes.status).toBe(403)
    expect(tamperedRes.body.error.message).toContain('Invalid signature')

    // 4. Expired signature -> 403 Forbidden
    const expiredUrl = `/api/v1/documents/${doc!.id}/download?expires=1000&sig=abcdef`
    const expiredRes = await request(app).get(expiredUrl)
    expect(expiredRes.status).toBe(403)
    expect(expiredRes.body.error.message).toContain('expired')
  })

  it('31. Auth refresh token: sets httpOnly cookie on login, rotates on /auth/refresh, revokes on logout', async () => {
    // 1. Login sets refreshToken cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'principal@iiitm-delhi.ac.in', password: 'password123' })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.token).toBeDefined()
    expect(loginRes.body.refreshToken).toBeDefined()
    const cookies = loginRes.headers['set-cookie']
    expect(cookies).toBeDefined()
    const refreshCookie = Array.isArray(cookies) ? cookies.find((c) => c.startsWith('refreshToken=')) : cookies
    expect(refreshCookie).toContain('HttpOnly')

    // 2. Refresh rotates token
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie!)
      .send()
    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.token).toBeDefined()
    expect(refreshRes.body.refreshToken).toBeDefined()

    // 3. Logout clears cookie
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie!)
      .send()
    expect(logoutRes.status).toBe(200)
    const logoutCookies = logoutRes.headers['set-cookie']
    const clearedCookie = Array.isArray(logoutCookies) ? logoutCookies.find((c) => c.startsWith('refreshToken=')) : logoutCookies
    expect(clearedCookie).toBeDefined()
  })

  it('32. CSV import: dryRun validates rows without inserting into DB; real run imports as SUBMITTED', async () => {
    const validRow = {
      institutionCode: '1-10023412',
      instrumentType: 'FDR',
      bankName: 'Canara Bank',
      branchName: 'Lodhi Road',
      referenceNumber: `CAN/IMP/${Date.now()}`,
      depositAmount: 5000000,
      interestRate: 7.1,
      issueDate: '2023-01-01',
      maturityDate: '2028-01-01',
    }

    const invalidRow = {
      institutionCode: '1-99999999',
      instrumentType: 'FDR',
      bankName: 'Canara Bank',
      referenceNumber: 'CAN/INVALID/001',
      depositAmount: -100,
      issueDate: 'invalid-date',
    }

    // 1. Dry run
    const dryRes = await request(app)
      .post('/api/v1/import/instruments?dryRun=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows: [validRow, invalidRow] })
    expect(dryRes.status).toBe(200)
    expect(dryRes.body.dryRun).toBe(true)
    expect(dryRes.body.totalRows).toBe(2)
    expect(dryRes.body.validRows).toBe(1)
    expect(dryRes.body.invalidRows).toBe(1)
    expect(dryRes.body.errors.length).toBe(1)

    // Verify dry run inserted 0 records
    const checkDb = await prisma.fDR.findFirst({
      where: { referenceNumber: validRow.referenceNumber },
    })
    expect(checkDb).toBeNull()

    // 2. Real import of valid row
    const realRes = await request(app)
      .post('/api/v1/import/instruments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows: [validRow] })
    expect(realRes.status).toBe(201)
    expect(realRes.body.dryRun).toBe(false)
    expect(realRes.body.importedCount).toBe(1)

    // Verify instrument created with trustLevel SUBMITTED
    const createdFdr = await prisma.fDR.findFirst({
      where: { referenceNumber: validRow.referenceNumber },
    })
    expect(createdFdr).toBeTruthy()
    expect(createdFdr?.trustLevel).toBe('SUBMITTED')
    expect(createdFdr?.trustSimulated).toBe(false)

    // 3. Attempt duplicate import -> row error
    const dupRes = await request(app)
      .post('/api/v1/import/instruments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows: [validRow] })
    expect(dupRes.status).toBe(400)
    expect(dupRes.body.errors[0].error).toContain('already exists')
  })

  it('33. Extended dashboard: returns trustLevelCounts, expiryBands, SLA statistics and drill-down endpoints', async () => {
    // 1. Summary
    const summaryRes = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(summaryRes.status).toBe(200)
    expect(summaryRes.body.trustLevelCounts).toBeDefined()
    expect(summaryRes.body.trustLevelCounts.SUBMITTED).toBeGreaterThan(0)
    expect(summaryRes.body.expiryBands).toBeDefined()
    expect(typeof summaryRes.body.missingDocumentsCount).toBe('number')
    expect(typeof summaryRes.body.activeHoldsCount).toBe('number')
    expect(typeof summaryRes.body.lienNotConfirmedCount).toBe('number')

    // 2. Drill-down trust-level
    const drillTrust = await request(app)
      .get('/api/v1/dashboard/drilldown/trust-level?level=SUBMITTED')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(drillTrust.status).toBe(200)
    expect(Array.isArray(drillTrust.body.instruments)).toBe(true)

    // 3. Drill-down expiry-band
    const drillExpiry = await request(app)
      .get('/api/v1/dashboard/drilldown/expiry-band?band=days30')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(drillExpiry.status).toBe(200)
    expect(Array.isArray(drillExpiry.body.instruments)).toBe(true)

    // 4. Drill-down active-holds
    const drillHolds = await request(app)
      .get('/api/v1/dashboard/drilldown/active-holds')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(drillHolds.status).toBe(200)
    expect(Array.isArray(drillHolds.body.holds)).toBe(true)

    // 5. Drill-down unconfirmed-liens
    const drillLiens = await request(app)
      .get('/api/v1/dashboard/drilldown/unconfirmed-liens')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(drillLiens.status).toBe(200)
    expect(Array.isArray(drillLiens.body.instruments)).toBe(true)
  })
})

