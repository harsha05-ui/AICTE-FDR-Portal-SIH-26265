-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INSTITUTION_USER', 'REVIEWER', 'APPROVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'DISCREPANCY_FLAGGED', 'CORRECTION_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MATURING_SOON', 'MATURED', 'RENEWED', 'REPLACED', 'RELEASED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INSTITUTION_USER',
    "designation" TEXT,
    "department" TEXT,
    "institutionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "institutionCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "region" TEXT,
    "type" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "principalName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FDR" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "ifscCode" TEXT,
    "accountNumber" TEXT,
    "depositAmount" DECIMAL(15,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL DEFAULT 7.0,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "jointAccount" BOOLEAN NOT NULL DEFAULT true,
    "lienMarked" BOOLEAN NOT NULL DEFAULT true,
    "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
    "previousFdrId" TEXT,
    "replacementFdrId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FDR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "fdrId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "checksum" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "fdrId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "result" "VerificationStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "remarks" TEXT,
    "verifiedFields" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalRecord" (
    "id" TEXT NOT NULL,
    "previousFdrId" TEXT NOT NULL,
    "replacementFdrId" TEXT,
    "submittedBy" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'RENEWAL',
    "status" "RenewalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "proposedAmount" DECIMAL(15,2),
    "proposedMaturity" TIMESTAMP(3),
    "newBankName" TEXT,
    "newBranchName" TEXT,
    "justification" TEXT,
    "remarks" TEXT,
    "reviewedBy" TEXT,
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseRequest" (
    "id" TEXT NOT NULL,
    "fdrId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'RELEASE',
    "reason" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "amount" DECIMAL(15,2) NOT NULL,
    "councilOrderRef" TEXT,
    "reviewedBy" TEXT,
    "decision" TEXT,
    "decisionRemarks" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "fdrId" TEXT,
    "type" TEXT NOT NULL,
    "thresholdDays" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeSummary" TEXT NOT NULL,
    "ipAddress" TEXT,
    "metadata" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "remarks" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_institutionCode_key" ON "Institution"("institutionCode");

-- CreateIndex
CREATE INDEX "Institution_institutionCode_idx" ON "Institution"("institutionCode");

-- CreateIndex
CREATE INDEX "Institution_region_idx" ON "Institution"("region");

-- CreateIndex
CREATE INDEX "Institution_status_idx" ON "Institution"("status");

-- CreateIndex
CREATE INDEX "FDR_referenceNumber_idx" ON "FDR"("referenceNumber");

-- CreateIndex
CREATE INDEX "FDR_institutionId_idx" ON "FDR"("institutionId");

-- CreateIndex
CREATE INDEX "FDR_verificationStatus_idx" ON "FDR"("verificationStatus");

-- CreateIndex
CREATE INDEX "FDR_lifecycleStatus_idx" ON "FDR"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "FDR_maturityDate_idx" ON "FDR"("maturityDate");

-- CreateIndex
CREATE UNIQUE INDEX "FDR_bankName_referenceNumber_key" ON "FDR"("bankName", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_fdrId_idx" ON "Document"("fdrId");

-- CreateIndex
CREATE INDEX "Document_uploadedBy_idx" ON "Document"("uploadedBy");

-- CreateIndex
CREATE INDEX "VerificationRecord_fdrId_idx" ON "VerificationRecord"("fdrId");

-- CreateIndex
CREATE INDEX "VerificationRecord_reviewerId_idx" ON "VerificationRecord"("reviewerId");

-- CreateIndex
CREATE INDEX "VerificationRecord_result_idx" ON "VerificationRecord"("result");

-- CreateIndex
CREATE INDEX "RenewalRecord_previousFdrId_idx" ON "RenewalRecord"("previousFdrId");

-- CreateIndex
CREATE INDEX "RenewalRecord_replacementFdrId_idx" ON "RenewalRecord"("replacementFdrId");

-- CreateIndex
CREATE INDEX "RenewalRecord_status_idx" ON "RenewalRecord"("status");

-- CreateIndex
CREATE INDEX "ReleaseRequest_fdrId_idx" ON "ReleaseRequest"("fdrId");

-- CreateIndex
CREATE INDEX "ReleaseRequest_requestedBy_idx" ON "ReleaseRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ReleaseRequest_status_idx" ON "ReleaseRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_recipientId_idx" ON "Notification"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_fdrId_idx" ON "Notification"("fdrId");

-- CreateIndex
CREATE INDEX "Notification_idempotencyKey_idx" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_fdrId_type_thresholdDays_key" ON "Notification"("fdrId", "type", "thresholdDays");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "WorkflowHistory_entityType_entityId_idx" ON "WorkflowHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "WorkflowHistory_timestamp_idx" ON "WorkflowHistory"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FDR" ADD CONSTRAINT "FDR_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FDR" ADD CONSTRAINT "FDR_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fdrId_fkey" FOREIGN KEY ("fdrId") REFERENCES "FDR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_fdrId_fkey" FOREIGN KEY ("fdrId") REFERENCES "FDR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalRecord" ADD CONSTRAINT "RenewalRecord_previousFdrId_fkey" FOREIGN KEY ("previousFdrId") REFERENCES "FDR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalRecord" ADD CONSTRAINT "RenewalRecord_replacementFdrId_fkey" FOREIGN KEY ("replacementFdrId") REFERENCES "FDR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalRecord" ADD CONSTRAINT "RenewalRecord_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRequest" ADD CONSTRAINT "ReleaseRequest_fdrId_fkey" FOREIGN KEY ("fdrId") REFERENCES "FDR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseRequest" ADD CONSTRAINT "ReleaseRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fdrId_fkey" FOREIGN KEY ("fdrId") REFERENCES "FDR"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
