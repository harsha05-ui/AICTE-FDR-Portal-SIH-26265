# AICTE Security Deposit & FDR Portal - Backend Project Status

**Sprint Completed**: 1-Sprint Production Backend Upgrade  
**Target Completion Time**: < 90 Minutes  
**Backend Framework**: Express 5 + TypeScript + Prisma + SQLite (Production target: PostgreSQL)

---

## 1. Demo Credentials & Authentication

Real stateless authentication is implemented with JWT tokens (8-hour expiry), Bcrypt password hashing (10 rounds), and IP-based rate limiting (10 attempts per 15 minutes). All fake session tracking, `currentSessionUserId`, and backdoors have been eliminated.

| Role | Email | Password | Scope / Organization |
| :--- | :--- | :--- | :--- |
| **INSTITUTION_USER (1)** | `principal@iiitm-delhi.ac.in` | `password123` | `[DEMO]` IIITM Delhi (`1-10023412`) |
| **INSTITUTION_USER (2)** | `registrar@vjti-mumbai.edu.in` | `password123` | `[DEMO]` VJTI Mumbai (`1-10045891`) |
| **REVIEWER** | `reviewer@aicte.gov.in` | `password123` | `[DEMO]` Northern Regional Bureau |
| **APPROVER** | `approver@aicte.gov.in` | `password123` | `[DEMO]` AICTE Approval & Regulatory Bureau |
| **ADMIN** | `admin@aicte.gov.in` | `password123` | `[DEMO]` AICTE National Headquarters |

---

## 2. API Endpoints Directory (Base: `/api/v1`)

| Method | Path | Access Control | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/login` | Public (Rate-limited) | Login using bcrypt compare; returns 8h JWT |
| **POST** | `/api/v1/auth/logout` | Authenticated | Closes session and records audit trail |
| **GET** | `/api/v1/auth/me` | Authenticated | Returns authenticated user profile |
| **GET** | `/api/v1/institutions` | Authenticated | List institutions (scoped for institution users) |
| **POST** | `/api/v1/institutions` | Admin Only | Register new institution |
| **GET** | `/api/v1/institutions/:id` | Authenticated | Get institution details by ID |
| **GET** | `/api/v1/fdrs` | Authenticated | List/search instruments (scoped by institution) |
| **POST** | `/api/v1/fdrs` | Authenticated | Register new FDR/Security Deposit in DRAFT status |
| **GET** | `/api/v1/fdrs/:id` | Authenticated | Retrieve instrument details, timeline, risk flags |
| **PATCH** | `/api/v1/fdrs/:id` | Owner Only | Edit instrument (only allowed in DRAFT or DISCREPANCY) |
| **POST** | `/api/v1/fdrs/:id/documents` | Owner / Scoped | Upload file (PDF/JPG/PNG <= 5MB, AES-256-GCM encrypted) |
| **GET** | `/api/v1/documents/:id/download` | Authorized / Scoped | Streams decrypted document |
| **POST** | `/api/v1/fdrs/:id/submit` | Institution Only | Submits instrument for verification; runs discrepancy rules |
| **POST** | `/api/v1/fdrs/:id/verify` | Reviewer, Admin | Verifies instrument (VERIFIED, DISCREPANCY, REJECTED) |
| **POST** | `/api/v1/fdrs/:id/renewals` | Institution Only | Submits renewal or replacement request |
| **GET** | `/api/v1/renewals` | Authenticated | List renewal petitions (scoped) |
| **POST** | `/api/v1/renewals/:id/decision` | Approver, Admin | Approves renewal; atomically generates linked instrument |
| **POST** | `/api/v1/fdrs/:id/release-requests`| Institution Only | Requests statutory release (validates demo rules) |
| **GET** | `/api/v1/release-requests` | Authenticated | List release requests (scoped) |
| **POST** | `/api/v1/release-requests/:id/review` | Reviewer, Admin | Reviewer preliminary review (UNDER_REVIEW) |
| **POST** | `/api/v1/release-requests/:id/decision`| Approver, Admin | Approver final release decision (sets RELEASED) |
| **GET** | `/api/v1/dashboard/summary` | Authenticated | Role-scoped KPIs, counts, SLA metrics, priority queue |
| **GET** | `/api/v1/reports/fdrs` | Authenticated | Export instruments in JSON or CSV with audit trail |
| **GET** | `/api/v1/audit-logs` | Admin, Reviewer | Immutable regulatory audit log |
| **GET** | `/api/v1/notifications` | Authenticated | User notifications & maturity alerts |
| **POST** | `/api/v1/notifications/:id/read` | Authenticated | Mark notification as read |
| **POST** | `/api/v1/notifications/mark-all-read` | Authenticated | Mark all notifications as read |
| **POST** | `/api/v1/admin/run-maturity-check` | Admin Only | Run maturity checks, deduped alerts, & SLA escalations |

*Backward compatibility aliases are supported for `/releases`, `/audit`, and `/fdrs/:id/verification`.*

---

## 3. Engineering Decisions & Architecture Highlights

1. **Database Engine Decision**:
   - Maintained **SQLite (`file:./dev.db`)** as requested for instant demo setup without external database daemon dependencies.
   - Status values are stored as standard string columns validated against TypeScript constant unions (`src/lib/types.ts`).
   - Whole rupee integer values used for all money fields (`depositAmount`, `amount`, `proposedAmount`).
2. **State Machine (`src/lib/workflow.ts`)**:
   - Verification workflow: `DRAFT -> SUBMITTED -> UNDER_REVIEW -> VERIFIED | DISCREPANCY | REJECTED`, with `DISCREPANCY -> SUBMITTED` upon correction.
   - Client is prohibited from submitting status fields; invalid transitions return HTTP `409 Conflict`.
   - Separation of duties strictly enforced: Submitter cannot verify; Reviewer of a request cannot approve it.
3. **Discrepancy Rules Engine (`src/lib/rules.ts`)**:
   - Automatically executed upon submission.
   - Evaluates: maturity before issue date, non-positive amounts, cross-bank duplicate reference numbers, missing documents, and past maturity dates.
   - Assigns `LOW`, `MEDIUM`, or `HIGH` risk levels and persists flags on the instrument.
4. **Document Encryption & Storage (`src/lib/encryption.ts` & `src/lib/magicBytes.ts`)**:
   - Uploaded files are validated for true binary magic bytes (PDF, JPG, PNG).
   - Encrypted at rest via **AES-256-GCM** using `FILE_ENC_KEY` from environment.
   - Stored in `./uploads/` with random per-file IV and authentication tag stored on Document record.
   - Decrypted only when streamed during an authorized, scoped download.
5. **Renewal & Replacement Chaining**:
   - Executes inside `prisma.$transaction`.
   - Marks the predecessor instrument as `RENEWED` and generates a linked successor instrument in `SUBMITTED` status.
6. **Statutory Release Demo Rules**:
   - Requires instrument to be `VERIFIED` with zero open discrepancies.
   - Enforces a mandatory two-tier workflow: Reviewer review must precede Approver decision.
7. **Scheduled Jobs & SLA Monitoring (`src/lib/maturityJob.ts`)**:
   - `node-cron` daily job with manual administrative trigger endpoint (`POST /admin/run-maturity-check`).
   - Deduplicated notifications for thresholds (90, 60, 30, 7 days) via `@@unique([fdrId, type, thresholdDays, userId])`.
   - Automatic escalation to Approvers if an instrument remains in review queue for > 3 days.

---

## 4. Verification & Test Results

- **TypeScript Compilation (`npx tsc --noEmit`)**: **0 Errors (Exit code 0)**
- **Build (`npm run build`)**: **Compiled successfully to `/dist`**
- **Test Suite (`npm test` via Vitest)**: **15 / 15 Passed (100% Pass Rate)**
  1. No token -> 401 Unauthorized
  2. Wrong role -> 403 Forbidden
  3. Institution A cannot read Institution B's FDR (Multi-tenant isolation)
  4. Invalid transition -> 409 Conflict
  5. Duplicate bank + reference -> 409 Conflict
  6. Renewal creates linked FDR in transaction
  7. Release blocked with open discrepancy
  8. Reminders not duplicated on subsequent cron execution
  9. Encrypted file round-trips correctly on authorized download
  10. JWT login returns valid token and sanitized identity
  11. Dashboard summary returns live computed metrics
  12. Reports export in JSON and CSV with audit logs
  13. Health endpoint metrics and latency
  14. Root health alias
  15. Unmatched routes return structured 404

---

## 5. Explicitly Skipped Items (Out of Scope for Sprint)

As specifically instructed in the sprint specification:
- **OCR processing**: Not implemented (replaced with true magic bytes validation & bank verification adapter interface).
- **Docker Compose execution**: Retained SQLite for immediate local execution.
- **Email delivery**: Alert mechanisms emit in-app notifications and SLA audit events.
- **PDF report generation**: Reports export as standard JSON and RFC 4180 CSV.
