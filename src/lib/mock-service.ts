import {
  FDRRecord,
  Institution,
  NotificationItem,
  AuditRecord,
  RenewalRequest,
  ReleaseRequest,
  User,
  VerificationStatus,
  RequestStatus,
  LifecycleStatus
} from '@/types'
import {
  INITIAL_USERS,
  INITIAL_INSTITUTIONS,
  INITIAL_FDRS,
  INITIAL_RENEWAL_REQUESTS,
  INITIAL_RELEASE_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from './mock-data'
import { ApiError } from './errors'

// In-memory data store for standalone/offline dev mode
class MockStore {
  users: User[] = [...INITIAL_USERS]
  institutions: Institution[] = [...INITIAL_INSTITUTIONS]
  fdrs: FDRRecord[] = [...INITIAL_FDRS]
  renewals: RenewalRequest[] = [...INITIAL_RENEWAL_REQUESTS]
  releases: ReleaseRequest[] = [...INITIAL_RELEASE_REQUESTS]
  notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS]
  auditLogs: AuditRecord[] = [...INITIAL_AUDIT_LOGS]
  currentUser: User | null = INITIAL_USERS[0] // Dr. Rajesh Sharma (Institution User) by default

  private delay(ms = 220): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Auth
  async login(email: string, _password: string): Promise<User> {
    await this.delay(300)
    const normalized = email.toLowerCase().trim()
    const found = this.users.find((u) => u.email.toLowerCase() === normalized)
    if (!found) {
      // Allow fallback login matching by email prefix or defaults
      if (normalized.includes('approver') || normalized.includes('director') || normalized.includes('radhakrishnan')) {
        this.currentUser = this.users.find((u) => u.role === 'APPROVER') || this.users[2]
        return this.currentUser
      }
      if (normalized.includes('admin') || normalized.includes('advisor') || normalized.includes('deshmukh')) {
        this.currentUser = this.users.find((u) => u.role === 'ADMIN') || this.users[3]
        return this.currentUser
      }
      if (normalized.includes('aicte') || normalized.includes('verma') || normalized.includes('reviewer')) {
        this.currentUser = this.users.find((u) => u.role === 'REVIEWER') || this.users[1]
        return this.currentUser
      }
      if (normalized.includes('iiitm') || normalized.includes('principal')) {
        this.currentUser = this.users[0] // Institution
        return this.currentUser
      }
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid official credentials. Please check your AICTE portal email or password.')
    }
    this.currentUser = found
    return found
  }

  async registerInstitution(data: {
    institutionCode: string
    institutionName: string
    principalName: string
    email: string
    password: string
    state?: string
    city?: string
    type?: string
    contactPhone?: string
  }): Promise<User> {
    await this.delay(200)
    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      aictePermanentId: data.institutionCode,
      name: data.institutionName,
      principalName: data.principalName,
      state: data.state || 'Delhi',
      city: data.city || 'New Delhi',
      type: data.type || 'Government',
      contactEmail: data.email,
      contactPhone: data.contactPhone || '+91 11 2690 7400',
      status: 'Active',
      totalDeposits: 0,
      activeInstruments: 0,
    }
    this.institutions.push(newInst)

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.principalName,
      email: data.email,
      role: 'INSTITUTION_USER',
      designation: 'Principal & Authorized Signatory',
      institutionId: newInst.id,
      institutionName: newInst.name,
      department: 'Administration',
    }
    this.users.push(newUser)
    this.currentUser = newUser
    return newUser
  }

  async logout(): Promise<void> {
    await this.delay(150)
    this.currentUser = null
  }

  async getCurrentUser(): Promise<User | null> {
    await this.delay(100)
    return this.currentUser
  }

  async switchRole(role: User['role']): Promise<User> {
    await this.delay(100)
    let target = role
    if (role === 'AICTE_OFFICIAL') target = 'REVIEWER'
    if (role === 'AICTE_ADMIN') target = 'ADMIN'
    const user = this.users.find((u) => u.role === target || u.role === role) || this.users[0]
    this.currentUser = user
    return user
  }

  // FDRs
  async getFDRs(params?: { search?: string; status?: string; institutionId?: string; bank?: string }): Promise<FDRRecord[]> {
    await this.delay(180)
    let list = [...this.fdrs]

    if (this.currentUser?.role === 'INSTITUTION_USER' && this.currentUser.institutionId) {
      list = list.filter((f) => f.institutionId === this.currentUser!.institutionId)
    } else if (params?.institutionId && params.institutionId !== 'all') {
      list = list.filter((f) => f.institutionId === params.institutionId)
    }

    if (params?.status && params.status !== 'all') {
      list = list.filter((f) => f.lifecycleStatus === params.status || f.verificationStatus === params.status)
    }

    if (params?.bank && params.bank !== 'all') {
      list = list.filter((f) => f.bankName.toLowerCase().includes(params.bank!.toLowerCase()))
    }

    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (f) =>
          f.fdrNumber.toLowerCase().includes(q) ||
          f.bankName.toLowerCase().includes(q) ||
          f.institutionName.toLowerCase().includes(q) ||
          f.accountNumber.includes(q)
      )
    }

    return list
  }

  async getFDRById(id: string): Promise<FDRRecord> {
    await this.delay(150)
    const found = this.fdrs.find((f) => f.id === id)
    if (!found) {
      throw new ApiError(404, 'FDR_NOT_FOUND', `Fixed Deposit Record with ID "${id}" was not found on the registry.`)
    }
    return found
  }

  async createFDR(data: Partial<FDRRecord>): Promise<FDRRecord> {
    await this.delay(350)
    if (!data.amount || Number(data.amount) <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Deposit amount must be a positive INR value.')
    }
    if (!data.issueDate || !data.maturityDate || new Date(data.maturityDate) <= new Date(data.issueDate)) {
      throw new ApiError(400, 'INVALID_DATES', 'Instrument maturity date must follow the issue date.')
    }

    const institution = this.institutions.find((i) => i.id === data.institutionId) || this.institutions[0]

    const newRecord: FDRRecord = {
      id: `fdr-${Date.now()}`,
      fdrNumber: data.fdrNumber || `FDR/${data.bankName?.slice(0, 3).toUpperCase() || 'BNK'}/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`,
      institutionId: institution.id,
      institutionName: institution.name,
      bankName: data.bankName || 'State Bank of India',
      branchName: data.branchName || 'Main Branch',
      ifscCode: data.ifscCode || 'SBIN0001000',
      accountNumber: data.accountNumber || '1029384756',
      amount: data.amount,
      interestRate: data.interestRate || 7.0,
      issueDate: data.issueDate,
      maturityDate: data.maturityDate,
      lifecycleStatus: (data.lifecycleStatus as LifecycleStatus) || 'Draft',
      verificationStatus: (data.verificationStatus as VerificationStatus) || 'Not submitted',
      jointAccount: data.jointAccount ?? true,
      lienMarked: data.lienMarked ?? true,
      autoRenewal: data.autoRenewal ?? false,
      documents: data.documents || [],
      verificationTimeline: [
        {
          id: `tl-${Date.now()}`,
          title: data.lifecycleStatus === 'Active' ? 'Submitted for Verification' : 'Draft FDR Created',
          timestamp: new Date().toISOString(),
          actor: this.currentUser?.name || 'Authorized Signatory',
          role: this.currentUser?.role || 'INSTITUTION_USER',
          notes: 'New instrument recorded via portal.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.fdrs.unshift(newRecord)

    // Audit log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: this.currentUser?.name || 'Institution Signatory',
      actorRole: this.currentUser?.role || 'INSTITUTION_USER',
      action: 'CREATE_FDR',
      entityType: 'FDR',
      entityId: newRecord.id,
      timestamp: new Date().toISOString(),
      changeSummary: `Created instrument ${newRecord.fdrNumber} (INR ${newRecord.amount}).`,
      ipAddress: '127.0.0.1',
    })

    return newRecord
  }

  async updateFDR(id: string, updates: Partial<FDRRecord>): Promise<FDRRecord> {
    await this.delay(250)
    const index = this.fdrs.findIndex((f) => f.id === id)
    if (index === -1) {
      throw new ApiError(404, 'FDR_NOT_FOUND', `FDR ${id} not found.`)
    }

    const existing = this.fdrs[index]
    const updated: FDRRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.fdrs[index] = updated

    return updated
  }

  // Verification actions
  async recordVerification(id: string, decision: 'Verified' | 'Discrepancy flagged' | 'Correction requested' | 'Rejected', comments: string, verifiedValues?: FDRRecord['verifiedValues']): Promise<FDRRecord> {
    await this.delay(350)
    const fdr = await this.getFDRById(id)
    fdr.verificationStatus = decision
    if (decision === 'Verified') {
      fdr.lifecycleStatus = 'Active'
    }
    fdr.reviewComments = comments
    if (verifiedValues) {
      fdr.verifiedValues = verifiedValues
    }
    fdr.verificationSource = 'Regional Officer Review'
    fdr.verificationTimeline = fdr.verificationTimeline || []
    fdr.verificationTimeline.push({
      id: `tl-${Date.now()}`,
      title: `Verification Decision: ${decision}`,
      timestamp: new Date().toISOString(),
      actor: this.currentUser?.name || 'Regional Officer',
      role: 'AICTE_OFFICIAL',
      notes: comments,
      status: decision,
    })

    // Audit
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: this.currentUser?.name || 'AICTE Official',
      actorRole: this.currentUser?.role || 'AICTE_OFFICIAL',
      action: `VERIFY_${decision.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: 'Verification',
      entityId: fdr.id,
      timestamp: new Date().toISOString(),
      changeSummary: `Recorded verification state "${decision}" for ${fdr.fdrNumber}: ${comments}`,
      ipAddress: '10.24.8.1',
    })

    // Notification to institution
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `FDR Verification Status: ${decision}`,
      message: `Instrument ${fdr.fdrNumber} was updated by AICTE Regional Office: ${comments}`,
      type: 'verification',
      urgency: decision === 'Discrepancy flagged' || decision === 'Rejected' ? 'urgent' : 'normal',
      timestamp: new Date().toISOString(),
      isRead: false,
      link: `/verification/${fdr.id}`,
    })

    return fdr
  }

  // Renewals & Replacements
  async getRenewals(): Promise<RenewalRequest[]> {
    await this.delay(150)
    return this.currentUser?.role === 'INSTITUTION_USER' && this.currentUser.institutionId
      ? this.renewals.filter((r) => r.institutionId === this.currentUser!.institutionId)
      : this.renewals
  }

  async createRenewal(req: Partial<RenewalRequest>): Promise<RenewalRequest> {
    await this.delay(300)
    const fdr = await this.getFDRById(req.fdrId!)

    const newReq: RenewalRequest = {
      id: `ren-${Date.now()}`,
      fdrId: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      requestType: req.requestType || 'Renewal',
      requestStatus: 'Submitted',
      submissionDate: new Date().toISOString(),
      proposedMaturityDate: req.proposedMaturityDate || '',
      proposedAmount: req.proposedAmount || fdr.amount,
      newBankName: req.newBankName,
      newBranchName: req.newBranchName,
      justification: req.justification || 'Statutory five-year security deposit renewal.',
      documents: req.documents || [],
    }

    this.renewals.unshift(newReq)
    return newReq
  }

  async decideRenewal(id: string, decision: 'Approved' | 'Declined', remarks: string): Promise<RenewalRequest> {
    await this.delay(300)
    const req = this.renewals.find((r) => r.id === id)
    if (!req) throw new ApiError(404, 'NOT_FOUND', 'Renewal request not found.')

    req.requestStatus = decision
    req.remarks = remarks
    req.decisionDate = new Date().toISOString()
    req.decidedBy = this.currentUser?.name

    if (decision === 'Approved') {
      const fdr = this.fdrs.find((f) => f.id === req.fdrId)
      if (fdr) {
        if (req.requestType === 'Replacement') {
          // Rule: old FDR marked as Replaced with link to successor
          const replacementId = `fdr-rep-${Date.now()}`
          const replacementFdr: FDRRecord = {
            ...fdr,
            id: replacementId,
            fdrNumber: `FDR/${(req.newBankName || fdr.bankName).slice(0, 3).toUpperCase()}/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`,
            bankName: req.newBankName || fdr.bankName,
            branchName: req.newBranchName || fdr.branchName,
            maturityDate: req.proposedMaturityDate,
            amount: req.proposedAmount,
            lifecycleStatus: 'Active',
            verificationStatus: 'Verified',
            previousFdrId: fdr.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          this.fdrs.unshift(replacementFdr)

          fdr.lifecycleStatus = 'Replaced'
          fdr.replacementFdrId = replacementId
          req.successorFdrId = replacementId
        } else {
          fdr.lifecycleStatus = 'Renewed'
          fdr.maturityDate = req.proposedMaturityDate
          fdr.amount = req.proposedAmount
        }
      }
    }

    return req
  }

  // Releases
  async getReleases(): Promise<ReleaseRequest[]> {
    await this.delay(150)
    return this.currentUser?.role === 'INSTITUTION_USER' && this.currentUser.institutionId
      ? this.releases.filter((r) => r.institutionId === this.currentUser!.institutionId)
      : this.releases
  }

  async createRelease(req: Partial<ReleaseRequest>): Promise<ReleaseRequest> {
    await this.delay(300)
    const fdr = await this.getFDRById(req.fdrId!)

    const newReq: ReleaseRequest = {
      id: `rel-${Date.now()}`,
      fdrId: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionId: fdr.institutionId,
      institutionName: fdr.institutionName,
      requestType: req.requestType || 'Release',
      requestStatus: 'Submitted',
      amount: req.amount || fdr.amount,
      submissionDate: new Date().toISOString(),
      reasonForRelease: req.reasonForRelease || '',
      councilApprovalRef: req.councilApprovalRef || '',
      documents: req.documents || [],
    }

    this.releases.unshift(newReq)
    return newReq
  }

  async decideRelease(id: string, decision: 'Approved' | 'Declined', remarks: string): Promise<ReleaseRequest> {
    await this.delay(300)
    const req = this.releases.find((r) => r.id === id)
    if (!req) throw new ApiError(404, 'NOT_FOUND', 'Release request not found.')

    req.requestStatus = decision
    req.remarks = remarks
    req.decisionDate = new Date().toISOString()
    req.decidedBy = this.currentUser?.name

    return req
  }

  async completeRelease(id: string): Promise<ReleaseRequest> {
    await this.delay(300)
    const req = this.releases.find((r) => r.id === id)
    if (!req) throw new ApiError(404, 'NOT_FOUND', 'Release request not found.')

    req.requestStatus = 'Completed'
    req.releaseCompletedAt = new Date().toISOString()

    const fdr = this.fdrs.find((f) => f.id === req.fdrId)
    if (fdr) {
      fdr.lifecycleStatus = 'Released'
      fdr.verificationTimeline = fdr.verificationTimeline || []
      fdr.verificationTimeline.push({
        id: `tl-${Date.now()}`,
        title: 'Security Deposit Released & Transferred',
        timestamp: new Date().toISOString(),
        actor: this.currentUser?.name || 'Finance Officer',
        role: 'AICTE_OFFICIAL',
        notes: `Statutory release executed. Funds disbursed as per council order.`,
        status: 'Released',
      })
    }

    return req
  }

  // Institutions
  async getInstitutions(): Promise<Institution[]> {
    await this.delay(180)
    return this.institutions
  }

  async getInstitutionById(id: string): Promise<Institution> {
    await this.delay(120)
    const found = this.institutions.find((i) => i.id === id)
    if (!found) throw new ApiError(404, 'NOT_FOUND', `Institution ${id} not found.`)
    return found
  }

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    await this.delay(120)
    return this.notifications
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.delay(100)
    const item = this.notifications.find((n) => n.id === id)
    if (item) {
      item.isRead = true
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.delay(120)
    this.notifications.forEach((n) => {
      n.isRead = true
    })
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditRecord[]> {
    await this.delay(150)
    return this.auditLogs
  }
}

export const mockStore = new MockStore()
