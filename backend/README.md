# AICTE Security Deposit / FDR Management Portal - Backend Service

Secure, type-safe, and production-ready statutory compliance backend API for the **AICTE Security Deposit / Fixed Deposit Receipt (FDR) Management Portal** (Smart India Hackathon SIH 2026, Problem Statement PS-26265).

---

## 1. Architecture & Technology Stack

- **Framework**: Express 5 + TypeScript (Strict mode)
- **Database & ORM**:
  - **Local Development**: SQLite (`file:./dev.db`) with Prisma Decimal and serialized strings for rapid, zero-dependency local testing.
  - **Production Target Engine**: PostgreSQL 16 with native PostgreSQL enums and `@db.Decimal(15,2)` / `@db.Decimal(5,2)` precision (`backend/prisma/schema.postgresql.prisma`).
- **Authentication**: Stateless JSON Web Tokens (JWT, 8-hour expiry), rotating refresh tokens in `httpOnly` `SameSite=Lax` cookies (7-day lifespan), bcrypt password hashing (10 rounds), and IP-based rate limiting on login (10 attempts per 15 minutes).
- **Authorization & Multi-Tenant Isolation**: Role-based access control (`INSTITUTION_USER`, `REVIEWER`, `APPROVER`, `ADMIN`) with multi-tenant institution data isolation and separation of duties.
- **Document Security**: At-rest document encryption using AES-256-GCM with per-file cryptographically random IVs and integrity authentication tags. Magic bytes verification (PDF, JPG, PNG). Time-bounded (5-minute) HMAC-SHA256 signed download links (`GET /documents/:id/download-url`).
- **Official Order Issuance**: Automated encrypted PDF generation for No Objection Certificates (NOC) and Statutory Sanction Orders upon final regulatory approval (`NOC/DEMO/YYYY/NNNN`).
- **Bank Verification Integration**: Pluggable bank verification adapter supporting `MANUAL` (default), `MOCK_DEMO` (with mandatory simulation indicators `trustSimulated = true`), and `LIVE` (SFMS/API stub).
- **Multi-Office Regulatory Release Engine**: Configurable sequential multi-office approval pipeline (`REGIONAL_OFFICE` → `APPROVAL_BUREAU` → `GRIEVANCE_CELL` → `VIGILANCE_CELL` → `COMPETENT_AUTHORITY`) with stage SLAs and audit tracking.
- **Regulatory Holds**: Institution-level hold system (`CBI`, `High Court`, `AICTE Vigilance`) blocking release docket creation and final approvals until officially cleared with audited remarks.
- **Bulk CSV Import**: High-performance instrument CSV import endpoint (`POST /import/instruments`) supporting `dryRun=true`, batch duplicate validation, and row-level error reporting.
- **Background Jobs**: Automated daily maturity & SLA escalation engine using `node-cron` with deduplicated statutory alerts, stage SLA escalations, and Nodemailer email integration with logged JSON transport fallback.
- **Documentation**: Interactive OpenAPI 3 / Swagger UI served at `/api-docs` and raw JSON at `/api-docs/swagger.json`.
- **Testing**: 36 comprehensive Vitest & Supertest automated tests covering all 5 statutory phases.

---

## 2. Seed Demonstration Accounts

All demo accounts are seeded with standard bcrypt-hashed credentials. The initial password for all demo accounts is **`password123`**.

| Role | Email | Password | Office / Department | Institution / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **INSTITUTION_USER (1)** | `principal@iiitm-delhi.ac.in` | `password123` | Institutional Signatory | `[DEMO]` IIITM Delhi (`1-10023412`) |
| **INSTITUTION_USER (2)** | `registrar@vjti-mumbai.edu.in` | `password123` | Institutional Signatory | `[DEMO]` VJTI Mumbai (`1-10045891`) |
| **REVIEWER (Regional)** | `reviewer@aicte.gov.in` | `password123` | `REGIONAL_OFFICE` | Northern Regional Directorate |
| **APPROVER (Bureau)** | `approver@aicte.gov.in` | `password123` | `APPROVAL_BUREAU` | Approval & Compliance Bureau |
| **GRIEVANCE OFFICER** | `grievance@aicte.gov.in` | `password123` | `GRIEVANCE_CELL` | National Grievance Redressal Cell |
| **VIGILANCE OFFICER** | `vigilance@aicte.gov.in` | `password123` | `VIGILANCE_CELL` | Chief Vigilance Bureau |
| **COMPETENT AUTHORITY** | `competent@aicte.gov.in` | `password123` | `COMPETENT_AUTHORITY` | AICTE Executive Council Secretariat |
| **ADMIN** | `admin@aicte.gov.in` | `password123` | Universal Cross-Office | National Statutory Registry Operations |

---

## 3. Complete Endpoints Directory (`/api/v1`)

### Authentication & Sessions (`/auth`)
- `POST /api/v1/auth/login` - Authenticate with email/password; returns access token and sets rotating `refreshToken` in an httpOnly cookie.
- `POST /api/v1/auth/refresh` - Rotate refresh token from cookie or body and obtain a fresh access token.
- `POST /api/v1/auth/logout` - Revoke current refresh cookie and record audit trail.
- `GET /api/v1/auth/me` - Retrieve authenticated identity, office, and institution scope.

### Institutions (`/institutions`)
- `GET /api/v1/institutions` - List institutions (scoped for institutions, global for officials).
- `GET /api/v1/institutions/:id` - Fetch single institution profile.
- `POST /api/v1/institutions` - Register new institution (Admin only).
- `POST /api/v1/institutions/:id/holds` - Place regulatory hold on an institution (Approver / Admin).

### FDRs & Statutory Instruments (`/fdrs`)
- `GET /api/v1/fdrs` - Search and list FDR/Security Deposit/Bank Guarantee instruments with computed `daysToMaturity`.
- `POST /api/v1/fdrs` - Register new instrument in `DRAFT` status with Zod schema validation.
- `GET /api/v1/fdrs/:id` - Retrieve instrument with timeline, documents, risk assessment, trust level, and lien status.
- `PATCH /api/v1/fdrs/:id` - Update instrument details (Owner only; allowed only in `DRAFT` or `DISCREPANCY`). Key-field edits reset trust to `SUBMITTED`.
- `POST /api/v1/fdrs/:id/documents` - Upload statutory file (PDF/JPG/PNG <= 5MB, AES-256-GCM encrypted, versioned).
- `POST /api/v1/fdrs/:id/submit` - Submit instrument for regulatory verification (runs statutory discrepancy rules).
- `POST /api/v1/fdrs/:id/verify` - Reviewer decision (`VERIFIED`, `DISCREPANCY`, `REJECTED`) with separation of duties. Sets `trustLevel = STAFF_VERIFIED`.
- `POST /api/v1/fdrs/:id/bank-verify` - Run bank verification adapter (`MANUAL`, `MOCK_DEMO`, `LIVE`). Honesty rule enforced: manual mode never sets `BANK_CONFIRMED`; mock mode sets `trustSimulated = true`.
- `PATCH /api/v1/fdrs/:id/lien` - Manage lien records (`CLAIMED_BY_INSTITUTION`, `CONFIRMED_BY_STAFF`, `CONFIRMED_BY_BANK`).
- `POST /api/v1/fdrs/:id/release-requests` - Request statutory deposit release (checked against active holds and discrepancy rules).

### Documents & Signed URLs (`/documents`)
- `GET /api/v1/documents/:id/download-url` - Generate 5-minute HMAC-SHA256 signed download link.
- `GET /api/v1/documents/:id/download` - Download and decrypt document (supports both Bearer token and HMAC-signed query parameters).

### Multi-Office Statutory Release Workflow (`/release-requests`)
- `GET /api/v1/release-requests` - List statutory release requests.
- `GET /api/v1/release-requests/:id` - Retrieve full release case with stage progression, SLA deadlines, and time spent per stage.
- `POST /api/v1/release-requests/:id/stages/:stageId/action` - Action a regulatory stage (`APPROVE`, `REJECT`, `RETURN` with mandatory remarks). Enforces office matching and separation of duties. Final stage approval triggers NOC/Sanction Order generation and marks instrument `RELEASED`.
- `GET /api/v1/release-requests/:id/order` - Download decrypted official NOC or Sanction Order PDF (`NOC/DEMO/YYYY/NNNN`).
- `POST /api/v1/release-requests/:id/review` - Legacy compatibility reviewer endpoint.
- `POST /api/v1/release-requests/:id/decision` - Legacy compatibility approver endpoint.

### Regulatory Holds (`/holds`)
- `GET /api/v1/holds` - List all regulatory holds with filtering by `active` and `institutionId`.
- `POST /api/v1/holds/:id/clear` - Clear an active hold with mandatory audit remarks (Approver / Admin).

### Statutory Settings & Rules (`/settings`)
- `GET /api/v1/settings` - Retrieve all statutory system settings (Staff read).
- `PUT /api/v1/settings/:key` - Update setting with Zod validation per key, cache invalidation, and audit log of old/new values (Admin only).

### CSV Bulk Import (`/import`)
- `POST /api/v1/import/instruments` - Bulk import instruments from CSV or JSON. Supports `?dryRun=true`, batch duplicate detection, row-level validation, and imports valid instruments with `SUBMITTED` trust (Admin only).

### Dashboard & Analytics (`/dashboard`)
- `GET /api/v1/dashboard/summary` - Comprehensive metrics including trust level counts, expiry bands (30/60/90/past), average days per stage, stuck cases beyond SLA, missing documents, active holds, unconfirmed liens, filterable by region, category, instrument type, and date range.
- `GET /api/v1/dashboard/drilldown/trust-level` - Drill-down list by trust level.
- `GET /api/v1/dashboard/drilldown/expiry-band` - Drill-down list by maturity expiry band.
- `GET /api/v1/dashboard/drilldown/stuck-stages` - Drill-down list of release stages exceeding SLA.
- `GET /api/v1/dashboard/drilldown/missing-documents` - Drill-down list of active instruments with missing documents.
- `GET /api/v1/dashboard/drilldown/active-holds` - Drill-down list of institutions under active regulatory holds.
- `GET /api/v1/dashboard/drilldown/unconfirmed-liens` - Drill-down list of unconfirmed liens.

### Reports & Audit Logs (`/reports`, `/audit-logs`)
- `GET /api/v1/reports/fdrs` - Export instruments in JSON or CSV format.
- `GET /api/v1/audit-logs` - Immutable compliance audit log recording actor, IP, timestamp, action, and old/new metadata (Admin / Reviewer).

### Notifications (`/notifications`)
- `GET /api/v1/notifications` - Retrieve compliance reminders and SLA alerts for authenticated user.
- `POST /api/v1/notifications/:id/read` - Mark single alert as read (IDOR protected: scoped to recipient user).
- `POST /api/v1/notifications/mark-all-read` - Mark all user alerts as read.

### Administration (`/admin`)
- `POST /api/v1/admin/run-maturity-check` - Idempotent manual trigger for statutory maturity checks, reminders, and stage SLA escalations.

---

## 4. Setup & Running Locally

```bash
cd backend
npm install
npm run prisma:push
npm run prisma:seed
npm test
npm run build
npm run dev
```

Interactive API documentation will be accessible at:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **OpenAPI JSON**: `http://localhost:5000/api-docs/swagger.json`
- **Health Check**: `http://localhost:5000/health`

---

## 5. Docker Deployment

A multi-stage production Dockerfile is included:

```bash
# Build and run complete stack (PostgreSQL + Backend)
docker compose up -d --build
```

---

## 6. Pre-Generated Demo Statutory Documents

Realistic, uncompressed PDF files have been generated and placed in `demo-documents/` and `public/demo-documents/` for testing the statutory pre-submission intake gate:

- **Passing Set (Matches Form Default)**:
  - FDR Certificate: `01_FDR_Certificate_PASS.pdf` (`FDR/SBI/2026/DEMO-PASS`, ₹1,00,00,000, State Bank of India, Okhla Phase 3)
  - Bank Letter: `02_Bank_Confirmation_Letter_PASS.pdf` (SBI official letterhead confirming deposit & lien)
  - Lien Endorsement: `03_Lien_Endorsement_Letter_PASS.pdf` (Lien marked in favour of Member Secretary, AICTE)
  - Institution Request: `04_Institution_Request_Letter_PASS.pdf` (IIITM Delhi letterhead signed by Principal)
- **Negative Test Cases (Demonstrating Blocker Detection)**:
  - `01_FDR_Certificate_AMOUNT_MISMATCH.pdf` (States ₹50,00,000 against ₹1,00,00,000 form)
  - `02_FDR_Certificate_NAME_MISMATCH.pdf` (Depositor stated as unrelated private corporation)
  - `03_FDR_Certificate_UNKNOWN_BANK_REF.pdf` (Reference number not in core banking simulation table)

Regenerate anytime via:
```bash
npx tsx scripts/generate-demo-documents.ts
```

