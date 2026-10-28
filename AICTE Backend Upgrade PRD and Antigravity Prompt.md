# AICTE Backend Upgrade: PRD and Antigravity Prompt

Security Deposit and FDR Management Portal | SIH 2026 PS 26265 | Backend upgrade v2 | Draft

This document has two parts. **Part A** is the PRD for upgrading the existing backend. **Part B** is a ready-to-paste prompt for Google Antigravity (or any coding agent) that implements Part A in phases.

Source of truth for the current state: the read-only backend audit. Anything marked *verify* must be confirmed in the code before changing it, because it was inferred from what the audit did not mention.

# Part A: PRD

## 1. Purpose

The existing backend (Node, Express, TypeScript, Prisma) already has a strong core: JWT auth, RBAC, institution scoping, separation of duties, a state machine with history, AES-256-GCM encrypted documents, renewal chaining, a maturity cron, a dashboard, CSV export and an audit log, with 15 passing tests.

This upgrade closes two kinds of gaps:

1. **Audit defects:** SQLite instead of PostgreSQL, Int/Float money, a notification IDOR, a hardcoded encryption key fallback, and missing email, signed downloads, refresh tokens, Swagger and Dockerfile.
2. **Differentiators from our research:** trust levels, a swappable bank-verification adapter, lien/control tracking, multiple instrument types, a configurable multi-office release workflow, holds that block release, admin-editable rules, and NOC/sanction PDFs.

## 2. Research basis (what we adopt, what we do not claim)

**What the research found**

- **USA:** the Department of Education can require an irrevocable letter of credit from a bank, payable directly to the Secretary. The regulator holds a claim on the bank, not a photocopy supplied by the college.
- **India:** the electronic Bank Guarantee (e-BG) on NeSL is live at 38 banks. NeSL acts as the central repository and validation authority, and offers APIs and notifications. The Directorate General of Shipping mandated it by office order.
- **AICTE today:** deposits are FDRs made out in favour of the Member Secretary, AICTE, or online/RTGS payments. We found no evidence that AICTE uses e-BG or NeSL, or that forgery is a major problem.
- **Real bottleneck found:** release passes through the Regional Office, Approval Bureau, Grievance Cell and Vigilance Cell, then an NOC (FDR) or sanction order (transfer). Release is blocked if a government or bank case is pending.

**What we build from it**

- A three-level **trust model** that separates what the institution claims from what staff checked and what a bank confirmed.
- A **verification adapter** that is manual by default, with a clearly labelled simulation mode, ready for a bank or NeSL-style integration when formally authorised.
- A **lien/control record** per instrument.
- A **configurable multi-office release workflow** with **holds**.

**What we must not claim**

- That AICTE uses e-BG or NeSL.
- That every institution must pay a deposit.
- Any deposit amount or duration as real. All values in settings are samples until checked against the Approval Process Handbook 2024-27 (Chapter I Table 1.4, Section 7.51).
- That simulated bank confirmation is real. It is always labelled as a simulation.

## 3. Goals and non-goals

**Goals:** make the backend match the PRD differentiators, fix all audit defects, keep all 15 existing tests passing, and keep every rule configurable.

**Non-goals:** real bank or NeSL integration, real payments, real AICTE data, OCR (optional, deferred), production hosting, SMS or WhatsApp.

## 4. Requirements

Priority: P0 must do first, P1 core differentiators, P2 polish.

### P0: Audit fixes

**R1. PostgreSQL migration.**

- Switch the Prisma datasource to `postgresql` and use `DATABASE_URL` from `.env.example`.
- Use native enums where the existing migration defines them.
- Money fields (`depositAmount`, `proposedAmount`, `amount`) become `Decimal(15,2)`. `interestRate` becomes `Decimal(5,2)`.
- Serialise Decimals as strings in JSON, and update helpers in `lib/params.ts`.
- Update seed and tests. Remove `dev.db` from the repo and add it to `.gitignore`.
- *Acceptance:* `docker compose up -d postgres`, `prisma migrate dev` and seed succeed, and all tests pass on PostgreSQL.

**R2. Notification IDOR.** `POST /notifications/:id/read` must scope by `userId`. Return 404 for other users' notifications. Add a test.

**R3. Secret hardening.** Remove the default `FILE_ENC_KEY`. In production, startup fails if `FILE_ENC_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET` or `SESSION_COOKIE_SECRET` is missing, short, or equals a known demo value.

**R4. Validation.** Add Zod schemas for `POST /fdrs` and `PATCH /fdrs/:id`. Add a computed `daysToMaturity` integer to every FDR response.

### P1: Differentiators

**R5. Trust levels.**

- New enum `TrustLevel`: `SUBMITTED`, `STAFF_VERIFIED`, `BANK_CONFIRMED`. It is a separate field from `verificationStatus` and `lifecycleStatus`.
- New instruments start at `SUBMITTED`. A successful staff verification sets `STAFF_VERIFIED`.
- `BANK_CONFIRMED` can only be set by the verification adapter, never by a client or a staff action.
- Editing a key field (amount, bank, reference, issue or maturity date) resets trust to `SUBMITTED` and writes history.
- Add `trustSimulated Boolean`. If the result came from the mock adapter it is `true`, and the API and UI must label it as a simulation.
- Every trust change writes `WorkflowHistory` and `AuditLog`.

**R6. Verification adapter.**

- One interface: `verifyInstrument(instrument) -> { status: CONFIRMED | NOT_FOUND | MISMATCH | NOT_INTEGRATED | MANUAL_REVIEW, source, simulated, details }`.
- Implementations: `ManualAdapter` (default, current behaviour), `MockBankAdapter` (reads a small seeded test table; always `simulated: true`), `LiveBankAdapter` (placeholder that throws `NOT_INTEGRATED`).
- Mode comes from the setting `verification.adapter_mode` (`MANUAL` by default, `MOCK_DEMO`, `LIVE`).
- New endpoint `POST /fdrs/:id/bank-verify` (Reviewer or Admin). Writes a `VerificationRecord`, updates trust, and returns the result.
- *Acceptance:* in `MANUAL` mode the endpoint returns `NOT_INTEGRATED` and never changes trust to `BANK_CONFIRMED`.

**R7. Lien / control record.**

- Fields on the instrument: `lienStatus` (`NOT_RECORDED`, `CLAIMED_BY_INSTITUTION`, `CONFIRMED_BY_STAFF`, `CONFIRMED_BY_BANK`), `lienNote`, `beneficiaryName` (in favour of), `lienConfirmedById`, `lienConfirmedAt`.
- Institutions can set `CLAIMED_BY_INSTITUTION`. Only staff can set `CONFIRMED_BY_STAFF`. `CONFIRMED_BY_BANK` only through the adapter.
- Release requests show a warning if lien is not confirmed.

**R8. Instrument types.**

- `instrumentType` enum: `FDR`, `RTGS_DEPOSIT`, `BANK_GUARANTEE`. *Verify* what exists today.
- Required fields per type come from settings (`instruments.required_fields`). Examples: FDR needs reference, bank, branch, issue, maturity, lien. RTGS needs transaction reference, bank, payment date. Bank guarantee needs guarantee number, bank, issue, expiry, claim expiry.
- The discrepancy engine validates by type.

**R9. Configurable multi-office release workflow.**

- New model `ReleaseStage`: request, office, order, assignedTo, status (`PENDING`, `ACTIVE`, `APPROVED`, `REJECTED`, `RETURNED`), remarks, dueAt, startedAt, completedAt.
- Office enum: `REGIONAL_OFFICE`, `APPROVAL_BUREAU`, `GRIEVANCE_CELL`, `VIGILANCE_CELL`, `COMPETENT_AUTHORITY`.
- Stage order and per-stage SLA days come from settings (`release.stage_order`, `release.stage_sla_days`). Default order is the five offices above.
- Users get an `office` field. A reviewer can only act on a stage for their own office. Admin can reassign.
- Actions: `POST /release-requests/:id/stages/:stageId/action` with `APPROVE`, `REJECT` or `RETURN` and mandatory remarks. Approving the last stage completes the release.
- Keep separation of duties (submitter cannot act, same person cannot approve two consecutive stages, if configured).
- `RETURN` sends the request back to the institution. Resubmitting restarts from the stage that returned it.
- Migrate the current two-tier flow without breaking existing release data and tests.
- Track time at each stage and expose it in `GET /release-requests/:id`.

**R10. Holds.**

- New model `Hold`: institution, reason, sourceBody, referenceNo, active, placedBy, placedAt, clearedBy, clearedAt, clearRemarks.
- Approver or Admin can place a hold. Clearing needs remarks. Both are audited.
- An active hold blocks creating a release request and blocks approval of the final stage of any open release, with a clear error.
- Endpoints: `GET /holds`, `POST /institutions/:id/holds`, `POST /holds/:id/clear`.

**R11. Settings.**

- New model `Setting`: key (unique), value (Json), description, isSample, updatedById, updatedAt.
- Endpoints: `GET /settings` (Reviewer, Approver, Admin), `PUT /settings/:key` (Admin only). Each key has a Zod schema. Every change writes an audit entry with old and new values.
- Keys: `reminders.thresholds_days`, `escalation.days`, `deposit.categories`, `documents.required_by_type`, `release.stage_order`, `release.stage_sla_days`, `instruments.required_fields`, `verification.adapter_mode`, `verification.pending_alert_days`.
- Seed sample values and mark `isSample: true`. Do not present sample deposit amounts as handbook values.
- The maturity job, rules engine and release logic must read from settings (cached for a short time), not from constants.

**R12. NOC / sanction order PDF.**

- New model `IssuedOrder`: release request, type (`NOC` for FDR and bank guarantee, `SANCTION_ORDER` for RTGS), referenceNo, file path, issuedBy, issuedAt.
- Generated on final approval using a PDF library, stored encrypted like other documents, and served only to authorised users.
- Reference format `NOC/DEMO/YYYY/NNNN`, labelled as a demo document.
- Endpoint: `GET /release-requests/:id/order`.

**R13. Extra discrepancy rules.** Add: depositor name vs institution name mismatch, validity shorter than the configured minimum, amount below the category requirement, manual verification pending longer than the configured days, and lien not confirmed. Keep the existing five rules. Each flag has a type, description and status.

**R14. Reminders, escalation and email.**

- Thresholds default to 90, 60, 30, 15, 7 and 0 days, from settings. Keep the dedup unique key.
- Escalation days from settings. Add escalation for release stages overdue against their SLA.
- Add Nodemailer with SMTP config. If SMTP is not configured, use a logged JSON transport and record that in the notification. Never crash the job on email failure.
- The job must be safe to re-run.

### P2: Polish

**R15. Signed download URLs.** `GET /documents/:id/download-url` returns an HMAC-signed URL valid 5 minutes. Downloads through it do not need the bearer token. Audit every issue and use.

**R16. Auth upgrade.** `POST /auth/refresh` with rotating refresh tokens in an httpOnly, secure, sameSite cookie. Logout revokes the token.

**R17. CSV import.** `POST /import/instruments` (Admin). Supports `dryRun=true`, returns row-level errors, matches on bank plus reference to avoid duplicates, and imports as `SUBMITTED` trust with source `IMPORT`.

**R18. Dashboard additions.** Trust-level counts, expiry bands (30, 60, 90 days), average days per release stage, cases stuck beyond SLA per office, missing-document count, active holds count, lien-not-confirmed count. All filterable by region, category, instrument type and date range, and every figure must have a drill-down list endpoint.

**R19. Documentation and packaging.** Full OpenAPI 3 spec served with Swagger UI at `/api-docs`. Multi-stage Dockerfile for the backend, wired into `docker-compose.yml`. Update README and `PROJECT_STATUS.md`.

## 5. API summary (new or changed)

| Method and path | Role | Purpose |
| --- | --- | --- |
| POST /fdrs/:id/bank-verify | Reviewer, Admin | Run adapter, update trust |
| PATCH /fdrs/:id/lien | Institution (claim), Reviewer (confirm) | Lien record |
| POST /release-requests/:id/stages/:stageId/action | Office reviewer, Approver, Admin | Approve, reject or return a stage |
| GET /release-requests/:id | Scoped | Full case with stages and time spent |
| GET /release-requests/:id/order | Scoped | NOC or sanction order PDF |
| GET /holds, POST /institutions/:id/holds, POST /holds/:id/clear | Approver, Admin | Hold management |
| GET /settings, PUT /settings/:key | Staff read, Admin write | Rules |
| GET /documents/:id/download-url | Scoped | Signed 5-minute link |
| POST /auth/refresh | Any | Rotate token |
| POST /import/instruments | Admin | CSV import with dry run |
| GET /dashboard/summary and drill-downs | Scoped | Extended metrics |

## 6. Security requirements

- Passwords stay bcrypt hashed, and secrets are never logged.
- All new endpoints use `authenticate`, `requireRole` and institution scoping.
- Clients can never set `trustLevel`, `trustSimulated`, `lienStatus` values above their role, lifecycle status or stage status directly.
- Settings changes, holds, trust changes, stage actions and order issuance are audited with old and new values.
- Fictional data only, all prefixed `[DEMO]`.

## 7. Testing and acceptance

All existing tests must keep passing. Add tests for:

1. Notification IDOR returns 404.
2. Production startup fails with a missing or default secret.
3. Client cannot set `trustLevel` or `BANK_CONFIRMED`.
4. Manual mode never produces `BANK_CONFIRMED`. Mock mode produces it with `trustSimulated = true`.
5. Key-field edit resets trust to `SUBMITTED`.
6. Release passes all five stages and generates an order with a reference number.
7. Stage reject and return behave correctly, and a reviewer from another office cannot act.
8. Active hold blocks release creation and final approval. Clearing without remarks fails.
9. Settings change alters job behaviour, and only Admin can write settings.
10. Maturity job is idempotent across two runs.
11. CSV import dry run creates nothing, and a real run reports row errors.
12. Signed URL expires after 5 minutes.

**Done means:** `npx tsc --noEmit` has zero errors, all tests pass on PostgreSQL, seed data demonstrates every demo scenario, and the README lists every new endpoint.

## 8. Phasing

1. **Phase 1:** R1 to R4 (database and audit fixes).
2. **Phase 2:** R5 to R8 (trust, adapter, lien, types).
3. **Phase 3:** R9 to R10 (release stages and holds).
4. **Phase 4:** R11 to R14 (settings, orders, rules, reminders).
5. **Phase 5:** R15 to R19 (polish and packaging).

## 9. Risks and open questions

- Some items are inferred as missing from the audit. The agent must verify first and report what it found.
- Moving Int to Decimal affects every calculation, test and the seed.
- The two-tier to multi-stage migration may affect existing release data.
- Real stage order, SLAs, deposit amounts and release conditions must come from the Approval Process Handbook 2024-27 before any pitch.
- Simulated bank confirmation could be mistaken for real. Mitigation: a mandatory simulation flag in API, UI and PDFs.

# Part B: Prompt for Antigravity

How to use it: open the existing backend folder in Antigravity, start the agent in Planning mode, paste the prompt below, and review the implementation plan before approving each phase. Run one phase at a time.

```
ROLE
You are a senior backend engineer upgrading an existing Node.js + Express + TypeScript + Prisma backend for the AICTE Security Deposit and FDR Management Portal (SIH 2026 PS 26265). Work in the existing repository. Do not rewrite it from scratch.

CONTEXT
The backend already has: JWT auth with bcrypt, RBAC, institution scoping, separation of duties, a workflow state machine with WorkflowHistory, AES-256-GCM encrypted document uploads with magic-byte checks, renewals in a Prisma transaction, release requests with reviewer then approver, a node-cron maturity job (90/60/30/7 days) with deduplicated notifications and 3-day escalation, a dashboard summary, CSV reports, an append-only AuditLog, a bank verification adapter stub (NOT_INTEGRATED / MANUAL_REVIEW), a seed script, and 15 passing Vitest tests. Routes live in src/modules/*/*.routes.ts, helpers in src/lib, middleware in src/middleware.

KNOWN DEFECTS
1. Prisma runs on SQLite (file:./dev.db) though PostgreSQL is intended. Money fields are Int and interestRate is Float.
2. POST /notifications/:id/read has an IDOR (no userId ownership check).
3. FILE_ENC_KEY has a hardcoded default with no production guard.
4. FDR create/patch use manual validation, not Zod. No daysToMaturity in responses.
5. No Nodemailer, no signed download URLs, no refresh tokens, /api-docs is a stub, no backend Dockerfile.

MISSING FEATURES (verify each in the code first, then build what is absent)
Trust levels, simulated bank adapter, lien/control record, instrument types (FDR, RTGS_DEPOSIT, BANK_GUARANTEE), configurable multi-office release stages, holds, settings table, NOC/sanction PDF, extra discrepancy rules, CSV import, extended dashboard.

RULES YOU MUST FOLLOW
- Start with a read-only check. Report which items above are truly missing, partial or already present. Do not assume.
- Work in phases. After each phase: run npx tsc --noEmit and the full test suite, summarise changes, list files touched, and STOP for my approval before the next phase.
- Never break existing endpoints or the 15 existing tests. If a change forces a test update, explain why.
- Use Prisma migrations. Never edit the database by hand.
- All deposit amounts, durations, stage orders, SLAs, reminder days and required documents must come from the Setting table, not constants. Seed them as SAMPLE values with isSample = true. Never present them as official AICTE values.
- Honesty rule: BANK_CONFIRMED may only be set by the verification adapter. Manual mode must never produce BANK_CONFIRMED. The mock adapter must always set simulated = true and trustSimulated = true, and every API response, audit entry and generated PDF involving it must say it is a simulation.
- Clients must never be able to set trustLevel, trustSimulated, lifecycle status, stage status, or lien status above their role. Reject with 409 or 403.
- Every new endpoint needs authenticate, requireRole, institution scoping, Zod validation, and an AuditLog entry with old and new values for state changes.
- All demo data is fictional and prefixed [DEMO]. No real bank or personal data.
- Do not claim AICTE uses e-BG or NeSL. The adapter is a plug-in slot for future authorised integration.

PHASE 1: Database and audit fixes
1. Switch schema.prisma to postgresql, use native enums, Decimal(15,2) for money and Decimal(5,2) for interestRate. Create a fresh migration, update lib/params.ts, serialise Decimals as strings, update seed and tests. Remove dev.db and gitignore it.
2. Fix the notification IDOR: scope by id and userId, return 404 otherwise. Add a test.
3. Remove the FILE_ENC_KEY default. In production, fail startup if FILE_ENC_KEY, JWT_SECRET, JWT_REFRESH_SECRET or SESSION_COOKIE_SECRET is missing, too short, or a known demo value. Add a test.
4. Add Zod schemas for POST /fdrs and PATCH /fdrs/:id. Add computed daysToMaturity to all FDR responses.
Acceptance: docker compose up -d postgres, prisma migrate dev, seed, tsc and all tests pass on PostgreSQL.

PHASE 2: Trust, adapter, lien, instrument types
1. Add enum TrustLevel (SUBMITTED, STAFF_VERIFIED, BANK_CONFIRMED) and fields trustLevel and trustSimulated on the instrument. Staff verification sets STAFF_VERIFIED. Editing amount, bank, reference, issue date or maturity date resets trust to SUBMITTED and writes history.
2. Refactor src/integrations/bankVerification.ts into an interface verifyInstrument(instrument) returning { status: CONFIRMED | NOT_FOUND | MISMATCH | NOT_INTEGRATED | MANUAL_REVIEW, source, simulated, details } with ManualAdapter (default), MockBankAdapter (reads a small seeded test table, always simulated) and LiveBankAdapter (throws NOT_INTEGRATED). Select by setting verification.adapter_mode.
3. Add POST /fdrs/:id/bank-verify (Reviewer, Admin). Write a VerificationRecord and update trust per the honesty rule.
4. Add lien fields: lienStatus (NOT_RECORDED, CLAIMED_BY_INSTITUTION, CONFIRMED_BY_STAFF, CONFIRMED_BY_BANK), lienNote, beneficiaryName, lienConfirmedById, lienConfirmedAt, with PATCH /fdrs/:id/lien and role limits.
5. Ensure instrumentType supports FDR, RTGS_DEPOSIT, BANK_GUARANTEE with per-type required fields read from setting instruments.required_fields.
Acceptance: tests for client cannot set trust, manual mode never BANK_CONFIRMED, mock sets trustSimulated, key-field edit resets trust.

PHASE 3: Multi-office release and holds
1. Add User.office and enum Office (REGIONAL_OFFICE, APPROVAL_BUREAU, GRIEVANCE_CELL, VIGILANCE_CELL, COMPETENT_AUTHORITY).
2. Add model ReleaseStage (request, office, order, assignedTo, status PENDING/ACTIVE/APPROVED/REJECTED/RETURNED, remarks, dueAt, startedAt, completedAt). Create stages from setting release.stage_order with due dates from release.stage_sla_days.
3. Add POST /release-requests/:id/stages/:stageId/action (APPROVE, REJECT, RETURN with mandatory remarks). Only the matching office reviewer or Admin may act. Keep separation of duties. Approving the last stage completes the release and sets the instrument to RELEASED in a transaction. RETURN goes back to the institution and resubmission restarts from the returning stage.
4. Migrate the existing two-tier flow and existing release rows safely. Expose time spent per stage in GET /release-requests/:id.
5. Add model Hold (institution, reason, sourceBody, referenceNo, active, placedBy, placedAt, clearedBy, clearedAt, clearRemarks) with GET /holds, POST /institutions/:id/holds, POST /holds/:id/clear (Approver, Admin; clearing needs remarks). An active hold blocks creating a release request and approving the final stage.
Acceptance: tests for full five-stage release, reject, return, wrong-office reviewer blocked, hold blocks then clears.

PHASE 4: Settings, orders, rules, reminders
1. Add model Setting (key unique, value Json, description, isSample, updatedById, updatedAt) with GET /settings (staff) and PUT /settings/:key (Admin only) with a Zod schema per key and audited changes. Keys: reminders.thresholds_days, escalation.days, deposit.categories, documents.required_by_type, release.stage_order, release.stage_sla_days, instruments.required_fields, verification.adapter_mode, verification.pending_alert_days. Seed SAMPLE values.
2. Make maturityJob, rules.ts and release logic read from settings (short cache). Thresholds default 90, 60, 30, 15, 7, 0.
3. Add model IssuedOrder and generate a PDF on final approval (NOC for FDR and bank guarantee, SANCTION_ORDER for RTGS) with reference NOC/DEMO/YYYY/NNNN, labelled as a demo document, stored encrypted, served via GET /release-requests/:id/order to authorised users only.
4. Add discrepancy rules: depositor name vs institution mismatch, validity below configured minimum, amount below category requirement, manual verification pending too long, lien not confirmed.
5. Add Nodemailer with SMTP config. If SMTP is unset, use a logged JSON transport. Email failure must never crash the job. Add escalation for release stages past SLA. The job must be idempotent.
Acceptance: settings change alters job behaviour, only Admin writes settings, job idempotent over two runs, order PDF generated with reference.

PHASE 5: Polish
1. GET /documents/:id/download-url returning an HMAC-signed URL valid 5 minutes; audit issue and use.
2. POST /auth/refresh with rotating refresh tokens in an httpOnly secure sameSite cookie; logout revokes.
3. POST /import/instruments (Admin) with dryRun, row-level errors, match on bank plus reference, import as SUBMITTED trust.
4. Extend /dashboard/summary: trust-level counts, expiry bands 30/60/90, average days per stage, stuck cases per office, missing documents, active holds, lien-not-confirmed; filters for region, category, instrument type, date range; a drill-down list endpoint for every figure.
5. Full OpenAPI 3 spec with Swagger UI at /api-docs, a multi-stage Dockerfile for the backend wired into docker-compose.yml, updated README and PROJECT_STATUS.md.

OUTPUT AT THE END OF EACH PHASE
- What you verified as already present vs missing
- Files changed
- Migrations created
- New or changed endpoints
- Test results and tsc result
- Anything that needs my decision
Then stop and wait.
```

Before the pitch, replace every sample setting value with figures from the Approval Process Handbook 2024-27, and keep the simulation labels visible in the demo.
