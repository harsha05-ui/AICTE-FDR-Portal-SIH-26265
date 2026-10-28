/**
 * AICTE Security Deposit / FDR Portal - Core Domain Models & Enums
 */

export type UserRole =
  | 'INSTITUTION_USER'
  | 'REVIEWER'
  | 'APPROVER'
  | 'ADMIN'
  | 'AICTE_OFFICIAL'
  | 'AICTE_ADMIN'

export type LifecycleStatus =
  | 'Draft'
  | 'Active'
  | 'Maturing soon'
  | 'Matured'
  | 'Renewed'
  | 'Replaced'
  | 'Released'
  | 'Closed'
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'MATURED'
  | 'RENEWED'
  | 'RELEASED'

export type VerificationStatus =
  | 'Not submitted'
  | 'Pending review'
  | 'Verified'
  | 'Discrepancy flagged'
  | 'Correction requested'
  | 'Rejected'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'DISCREPANCY'
  | 'REJECTED'

export type RequestStatus =
  | 'Submitted'
  | 'Under review'
  | 'Approved'
  | 'Declined'
  | 'Completed'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'DECLINED'
  | 'COMPLETED'

export type RequestType = 'Renewal' | 'Replacement' | 'Release' | 'Refund' | 'RENEWAL' | 'REPLACEMENT' | 'RELEASE' | 'REFUND'
export type InstrumentType = 'FDR' | 'SECURITY_DEPOSIT'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type OfficeRole =
  | 'REGIONAL_OFFICE'
  | 'APPROVAL_BUREAU'
  | 'GRIEVANCE_CELL'
  | 'VIGILANCE_CELL'
  | 'COMPETENT_AUTHORITY'

export type TrustLevel = 'SUBMITTED' | 'STAFF_VERIFIED' | 'BANK_CONFIRMED'
export type LienStatus = 'NOT_MARKED' | 'MARKED' | 'CONFIRMED' | 'RELEASED' | 'INVOKED'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  officeRole?: OfficeRole
  designation?: string
  institutionId?: string
  institutionName?: string
  department?: string
  token?: string
}

export interface DocumentItem {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  category: string
  version?: number
  url: string
  slotType?: string
  documentType?: string
  originalFilename?: string
  extraction?: {
    id?: string
    status: 'PENDING' | 'DONE' | 'FAILED' | string
    method: 'TEXT_LAYER' | 'OCR' | 'NONE' | string
    confidence: number
    extractedFields?: string
  }
}

export interface FDRRecord {
  id: string
  fdrNumber: string
  referenceNumber?: string
  institutionId: string
  institutionName: string
  bankName: string
  branchName: string
  ifscCode: string
  accountNumber: string
  amount: number | string
  depositAmount?: number
  interestRate: number
  instrumentType?: InstrumentType | string
  issueDate: string
  maturityDate: string
  lifecycleStatus: LifecycleStatus
  verificationStatus: VerificationStatus
  trustLevel?: TrustLevel | string
  isSimulated?: boolean
  lienStatus?: LienStatus | string
  lienReferenceNumber?: string
  lienConfirmedAt?: string
  riskLevel?: RiskLevel | string
  flags?: string[]
  riskFlags?: string[] | string
  institution?: Institution
  jointAccount: boolean
  lienMarked: boolean
  autoRenewal: boolean
  previousFdrId?: string
  replacementFdrId?: string
  documents: DocumentItem[]
  verifications?: any[]
  verifiedValues?: {
    amount?: number
    maturityDate?: string
    bankName?: string
    branchName?: string
    jointAccount?: boolean
    lienMarked?: boolean
  }
  verificationSource?: string
  reviewComments?: string
  verificationTimeline?: TimelineEvent[]
  workflowHistory?: any[]
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  title: string
  timestamp: string
  actor: string
  role: string
  notes?: string
  status?: string
}

export interface HoldRecord {
  id: string
  institutionId: string
  institutionName?: string
  reason: string
  sourceBody: string
  referenceNumber?: string
  status: 'ACTIVE' | 'CLEARED'
  placedAt: string
  placedBy: string
  clearedAt?: string
  clearedBy?: string
  clearRemarks?: string
}

export interface Institution {
  id: string
  aictePermanentId: string
  institutionCode?: string
  name: string
  state?: string
  city?: string
  region?: string
  type?: string
  contactEmail?: string
  contactPhone?: string
  status: string
  totalDeposits: number | string
  activeInstruments: number
  address?: string
  principalName?: string
  holds?: HoldRecord[]
  activeHoldsCount?: number
}

export interface RenewalRequest {
  id: string
  fdrId: string
  fdrNumber: string
  institutionId: string
  institutionName: string
  requestType: RequestType
  type?: string
  requestStatus: RequestStatus
  status?: string
  submissionDate: string
  proposedMaturityDate: string
  proposedAmount: number | string
  amount?: number | string
  newBankName?: string
  newBranchName?: string
  justification: string
  documents?: DocumentItem[]
  remarks?: string
  decisionDate?: string
  decisionAt?: string
  decidedBy?: string
  reviewedBy?: string
  successorFdrId?: string
  replacementFdrId?: string
  replacementFdrNumber?: string
  originalInstrument?: FDRRecord
}

export interface ReleaseStage {
  id: string
  releaseRequestId: string
  office: OfficeRole
  sequence: number
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETURNED'
  enteredAt: string
  actionedAt?: string
  slaHours: number
  slaDueDate?: string
  actionRemarks?: string
  actorName?: string
  isOverdue?: boolean
}

export interface ReleaseRequest {
  id: string
  fdrId: string
  fdrNumber: string
  institutionId: string
  institutionName: string
  requestType: RequestType
  requestStatus: RequestStatus
  status?: string
  amount: number | string
  submissionDate: string
  reasonForRelease?: string
  reason?: string
  councilApprovalRef?: string
  councilOrderRef?: string
  documents?: DocumentItem[]
  remarks?: string
  decisionRemarks?: string
  decisionDate?: string
  decidedBy?: string
  reviewedBy?: string
  completedAt?: string
  releaseCompletedAt?: string
  stages?: ReleaseStage[]
  currentStage?: ReleaseStage
  orderUrl?: string
  hasActiveHolds?: boolean
  instrument?: FDRRecord
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  thresholdDays?: number
  urgency: 'normal' | 'high' | 'urgent' | 'NORMAL' | 'HIGH' | 'URGENT'
  timestamp: string
  isRead: boolean
  link?: string
}

export interface AuditRecord {
  id: string
  actorId?: string
  actorName: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  timestamp: string
  changeSummary: string
  ipAddress: string
  metadata?: any
}

export interface PortalSetting {
  id: string
  key: string
  value: any
  description?: string
  category?: string
  updatedAt: string
}

export interface DashboardSummary {
  countsByLifecycle: {
    ACTIVE: number
    EXPIRING: number
    MATURED: number
    RENEWED: number
    RELEASED: number
  }
  pendingVerifications: number
  overdueCases: number
  expiringIn30Days: number
  pendingRenewalRequests: number
  pendingReleaseRequests: number
  activeHoldsCount?: number
  trustLevelBreakdown?: {
    SUBMITTED: number
    STAFF_VERIFIED: number
    BANK_CONFIRMED: number
    SIMULATED: number
  }
  metrics: {
    avgVerificationHours: number
    discrepanciesFlaggedCount: number
    remindersGeneratedCount: number
    casesPendingBeyondSla: number
    totalDocumentsMissing: number
  }
  priorityQueue: Array<{
    id: string
    fdrNumber: string
    institutionName: string
    bankName: string
    amount: string
    maturityDate: string
    verificationStatus: string
    lifecycleStatus: string
    trustLevel?: string
    isSimulated?: boolean
    riskLevel: string
    flags: string[]
  }>
}

export interface PreSubmissionCheckItem {
  id?: string
  checkType: string
  field: string
  status: 'PASSED' | 'FAILED' | 'MATCH' | 'MISMATCH' | 'NOT_FOUND'
  details: {
    message?: string
    formValue?: any
    certificateValue?: any
    bankReceiptValue?: any
    similarity?: number
    [key: string]: any
  }
  simulated: boolean
  createdAt?: string
}

export interface BankReceiptData {
  id?: string
  receiptRef: string
  source: 'LIVE' | 'MOCK' | 'MANUAL_LETTER'
  simulated: boolean
  status: 'CONFIRMED' | 'NOT_FOUND' | 'MISMATCH' | 'FAILED'
  receivedAt: string
  payload?: any
}

export interface PrecheckResponse {
  canSubmit: boolean
  gateMode: 'STRICT_BANK_RECEIPT' | 'DOCUMENT_ONLY'
  blockers: string[]
  checks: PreSubmissionCheckItem[]
  bankReceipt: BankReceiptData | null
  slotSummary?: Array<{
    slotType: string
    label: string
    mandatory: boolean
    uploaded: boolean
    documentId?: string
    fileName?: string
    extractionStatus?: string
  }>
  extractions?: Record<
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
