# AICTE Security Deposit & FDR Portal - Backend Project Status

**Sprint Completed**: Complete End-to-End Statutory Backend Upgrade (Phases 1 to 5)  
**Problem Statement**: SIH 2026 PS-26265 - Security Deposit / FDR Management Portal for AICTE  
**Architecture**: Express 5 + TypeScript + Prisma (Dual-target: SQLite dev / PostgreSQL production) + AES-256-GCM + Nodemailer + node-cron + PDFKit + OpenAPI 3

---

## 1. Summary of Completed Phases

| Phase | Description | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Database & Audit Fixes** | PostgreSQL schema (`schema.postgresql.prisma`) with native enums & Decimal(15,2); Notification IDOR fix; strict production secret validation; Zod schemas for FDR create/patch; computed `daysToMaturity` in all FDR responses. | **100% DONE** |
| **Phase 2** | **Trust Levels, Adapter & Lien** | `TrustLevel` (`SUBMITTED`, `STAFF_VERIFIED`, `BANK_CONFIRMED`); Honest bank verification adapter (`ManualAdapter`, `MockBankAdapter` with `trustSimulated=true`, `LiveBankAdapter`); Key-field edit trust reset; Lien management (`PATCH /fdrs/:id/lien`); Instrument types (`FDR`, `RTGS_DEPOSIT`, `BANK_GUARANTEE`). | **100% DONE** |
| **Phase 3** | **Multi-Office Workflow & Holds** | 5-stage sequential regulatory approval workflow (`REGIONAL_OFFICE` → `APPROVAL_BUREAU` → `GRIEVANCE_CELL` → `VIGILANCE_CELL` → `COMPETENT_AUTHORITY`); Stage action endpoint (`APPROVE`, `REJECT`, `RETURN`) with office scoping & separation of duties; `Hold` model with `GET /holds`, `POST /institutions/:id/holds`, `POST /holds/:id/clear`; Hold blocking release creation and final approval. | **100% DONE** |
| **Phase 4** | **Settings, Orders & Rules** | Statutory `Setting` table with `GET /settings` and `PUT /settings/:key` (Admin only, Zod validated per key, cached); Official encrypted NOC & Sanction Order PDF generation (`IssuedOrder`, `GET /release-requests/:id/order`); Extra discrepancy rules (depositor name mismatch, validity below minimum tenure, amount below category, manual verification pending exceeded, lien not confirmed); Nodemailer email integration with JSON transport fallback, release stage SLA escalation, and idempotent cron execution. | **100% DONE** |
| **Phase 5** | **Polish & Packaging** | 5-minute HMAC-SHA256 signed download links (`GET /documents/:id/download-url`); Rotating refresh tokens in `httpOnly` `SameSite=Lax` cookies (`POST /auth/refresh`, `POST /auth/logout`); Bulk CSV import with `dryRun=true` (`POST /import/instruments`); Extended dashboard metrics & 6 drill-down endpoints; Interactive OpenAPI 3 / Swagger UI at `/api-docs`; Multi-stage Dockerfile and Docker Compose wiring. | **100% DONE** |

---

## 2. Seed Demonstration Accounts

All demo accounts are seeded with standard bcrypt-hashed credentials. Password: **`password123`**.

| Role | Email | Password | Office / Department | Scope / Institution |
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

| Method | Path | Role / Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/login` | Public (Rate-limited) | Authenticate; returns access token and sets rotating `refreshToken` httpOnly cookie |
| **POST** | `/auth/refresh` | Public / Cookie | Rotate refresh token and obtain new access token |
| **POST** | `/auth/logout` | Authenticated | Revoke refresh cookie and audit logout |
| **GET** | `/auth/me` | Authenticated | Return authenticated profile, office, and institution scope |
| **GET** | `/institutions` | Scoped | List technical institutions (scoped for institution users) |
| **GET** | `/institutions/:id` | Scoped | Fetch single institution profile |
| **POST** | `/institutions` | Admin Only | Register technical institution |
| **POST** | `/institutions/:id/holds` | Approver, Admin | Place regulatory hold on an institution |
| **GET** | `/fdrs` | Scoped | Search/list FDR, BG, RTGS instruments with `daysToMaturity` |
| **POST** | `/fdrs` | Institution Only | Create new statutory deposit in `DRAFT` status (Zod validated) |
| **GET** | `/fdrs/:id` | Scoped | Retrieve instrument docket with trust level, lien status, and risk flags |
| **PATCH** | `/fdrs/:id` | Owner Only | Edit instrument; key-field edits reset trustLevel to `SUBMITTED` |
| **POST** | `/fdrs/:id/documents` | Scoped | Upload binary-validated file (AES-256-GCM encrypted at rest) |
| **GET** | `/documents/:id/download-url` | Scoped | Generate 5-minute HMAC-SHA256 signed download link |
| **GET** | `/documents/:id/download` | Scoped or Signed | Decrypt and stream document (supports Bearer or signed HMAC URL) |
| **POST** | `/fdrs/:id/submit` | Institution Only | Submit instrument for verification; runs 9 discrepancy rules |
| **POST** | `/fdrs/:id/verify` | Reviewer, Admin | Reviewer decision (`VERIFIED`, `DISCREPANCY`, `REJECTED`) |
| **POST** | `/fdrs/:id/bank-verify` | Reviewer, Admin | Run bank verification adapter (`MANUAL`, `MOCK_DEMO`, `LIVE`) |
| **PATCH** | `/fdrs/:id/lien` | Institution / Reviewer | Record or confirm lien beneficiary with role boundaries |
| **POST** | `/fdrs/:id/renewals` | Institution Only | Submit renewal or replacement petition |
| **GET** | `/renewals` | Scoped | List renewal requests |
| **POST** | `/renewals/:id/decision` | Approver, Admin | Approve renewal; atomically create successor instrument in transaction |
| **POST** | `/fdrs/:id/release-requests`| Institution Only | Request statutory deposit release (checked against holds and rules) |
| **GET** | `/release-requests` | Scoped | List statutory release cases |
| **GET** | `/release-requests/:id` | Scoped | Retrieve full release docket with stages and time spent breakdown |
| **POST** | `/release-requests/:id/stages/:stageId/action` | Office Reviewer, Admin | Action stage (`APPROVE`, `REJECT`, `RETURN`). Last stage approval releases FDR & generates order |
| **GET** | `/release-requests/:id/order` | Scoped | Download decrypted official NOC or Sanction Order PDF (`NOC/DEMO/YYYY/NNNN`) |
| **GET** | `/holds` | Approver, Admin | List all regulatory holds with active and institution filters |
| **POST** | `/holds/:id/clear` | Approver, Admin | Clear regulatory hold with mandatory audit remarks |
| **GET** | `/settings` | Staff Read | Read statutory system settings |
| **PUT** | `/settings/:key` | Admin Only | Update setting with Zod validation per key, cache invalidation & audit |
| **POST** | `/import/instruments` | Admin Only | Bulk import instruments from CSV or JSON (`dryRun=true` supported) |
| **GET** | `/dashboard/summary` | Scoped | Comprehensive KPIs, trust levels, expiry bands, SLA status, priority queue |
| **GET** | `/dashboard/drilldown/trust-level` | Scoped | Drill-down list by trust level (`SUBMITTED`, `STAFF_VERIFIED`, `BANK_CONFIRMED`) |
| **GET** | `/dashboard/drilldown/expiry-band` | Scoped | Drill-down list by maturity band (`days30`, `days60`, `days90`, `pastMaturity`) |
| **GET** | `/dashboard/drilldown/stuck-stages` | Scoped | Drill-down list of release stages exceeding SLA |
| **GET** | `/dashboard/drilldown/missing-documents` | Scoped | Drill-down list of instruments lacking required attachments |
| **GET** | `/dashboard/drilldown/active-holds` | Scoped | Drill-down list of institutions under active regulatory hold |
| **GET** | `/dashboard/drilldown/unconfirmed-liens` | Scoped | Drill-down list of active instruments with unconfirmed liens |
| **GET** | `/reports/fdrs` | Scoped | Export instruments in JSON or CSV with audit trail |
| **GET** | `/audit-logs` | Admin, Reviewer | Immutable regulatory audit log recording old/new values, IP, timestamp |
| **GET** | `/notifications` | Scoped | Retrieve compliance reminders and SLA alerts for authenticated user |
| **POST** | `/notifications/:id/read` | Scoped (IDOR-safe)| Mark notification as read (scoped to recipient user) |
| **POST** | `/notifications/mark-all-read` | Scoped | Mark all user notifications as read |
| **POST** | `/admin/run-maturity-check` | Admin Only | Idempotent trigger for maturity checks, reminders & stage SLA escalations |

---

## 4. Test Verification Results

- **TypeScript Compilation (`npx tsc --noEmit`)**: **0 Errors (Exit code 0)**
- **Test Suite (`npm test` via Vitest)**: **36 / 36 Passed (100% Pass Rate across 2 test files)**

### Automated Tests Breakdown:
1. No token -> 401 Unauthorized
2. Wrong role -> 403 Forbidden
3. Institution A cannot read Institution B's FDR (Multi-tenant isolation)
4. Invalid transition -> 409 Conflict
5. Duplicate bank + reference -> 409 Conflict
6. Renewal creates a linked FDR in transaction
7. Release blocked with an open discrepancy
8. Reminders not duplicated on subsequent cron execution
9. Encrypted file round-trips on authorized download
10. POST /auth/login returns JWT token and sanitized profile
11. GET /dashboard/summary returns computed metrics
12. GET /reports/fdrs supports JSON and CSV export with audit logging
13. Health endpoint metrics and latency
14. Root health alias
15. Unmatched routes return structured JSON 404
16. Notification read IDOR returns 404 for unauthorized user
17. Startup fails when secrets are missing, too short, or demo values in production
18. Manual mode (default) bank-verify returns NOT_INTEGRATED and never sets BANK_CONFIRMED
19. MockBankAdapter sets BANK_CONFIRMED with trustSimulated = true and lien confirmed
20. Key-field edit via PATCH resets trustLevel to SUBMITTED
21. PATCH /fdrs/:id/lien enforces role limits and honesty rule
22. Active hold blocks release request creation; clearing without remarks fails; clearing succeeds
23. Multi-office release passes 5 stages; wrong-office blocked; completing final stage releases FDR
24. Stage REJECT declines request and Stage RETURN sends back to institution
25. Active hold placed mid-workflow blocks final stage approval
26. Final release approval generates IssuedOrder and GET /release-requests/:id/order returns decrypted PDF
27. Settings management: staff cannot write settings; Admin updates setting and cache invalidates
28. Maturity job is idempotent across multiple runs
29. Extra discrepancy rules flag amounts below category requirement and unconfirmed lien
30. Signed download URL: valid 5 minutes; unauthenticated download succeeds; forged/expired fails
31. Auth refresh token: sets httpOnly cookie on login, rotates on /auth/refresh, revokes on logout
32. CSV import: dryRun validates rows without inserting into DB; real run imports as SUBMITTED
33. Extended dashboard: returns trustLevelCounts, expiryBands, SLA statistics and drill-down endpoints
34. Health check endpoint status
35. Unmatched routes structured error
36. Root health alias check
