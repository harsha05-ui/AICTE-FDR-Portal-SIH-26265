# AICTE Security Deposit & Fixed Deposit Receipt (FDR) Portal
## SIH 2026 — Problem Statement PS-26265

> **Statutory Compliance Registry and Digital Oversight Platform for AICTE Security Deposits, Guarantees, Renewals, Multi-Office Release Consensus, and Regulatory Freeze Management.**

---

## 🏛️ Executive Summary

Under the All India Council for Technical Education (AICTE) Approval Process Handbook (APH), technical institutions across India are required to maintain joint fixed deposits or bank guarantees as statutory security deposits. 

This portal provides an authoritative, regulator-grade management platform replacing fragmented physical paperwork and disconnected spreadsheets with:
- **Immutable Trust Levels**: Statutory progression from `SUBMITTED` ➔ `STAFF_VERIFIED` ➔ `BANK_CONFIRMED`, with transparent visual simulation hatching whenever mock bank bridges are active.
- **Strict Joint Lien Tracking**: Tracking states (`NOT_MARKED`, `MARKED`, `CONFIRMED`, `RELEASED`, `INVOKED`) with bank endorsement notations.
- **5-Office Consensus Ribbon**: Sequential release lifecycle across Regional Office, Approval Bureau, Grievance Cell, Vigilance Cell, and Competent Authority with strict SLA timer controls.
- **Regulatory Hold Enforcement**: Injunction and freeze management immediately blocking deposit releases upon orders from Central Vigilance, CBI, or Court mandates.
- **Interactive KPI Drill-Downs**: Real-time compliance monitoring across trust levels, maturity bands, stuck consensus stages, missing certificate scans, active holds, and unconfirmed liens.
- **Bulk CSV Ingestion & Dry-Run Validation**: Pre-commit validation catching row-level syntax and statutory violations before database inscription.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 8 |
| **Styling & Theme** | Vanilla CSS Design Tokens (`tokens.css`, `motion.css`), Tailwind CSS 3.4 utilities |
| **State & API Cache** | TanStack React Query v5 |
| **Routing & Auth** | React Router v7, Memory JWT cache with HTTP-only cookie refresh rotation |
| **Icons & Visuals** | Lucide React, Recharts |
| **Backend Integration** | Express, Node.js, Prisma ORM, SQLite (`dev.db`), AES-256 encrypted documents |

---

## 💎 Design System & Statutory Tokens

The user interface adheres to a disciplined, calm, authoritative fintech design language:
- **Color Palette**: Deep institutional navy (`#0B1B3D`), light canvas (`#F8FAFC`), crisp hair-lines (`#E2E8F0`), statutory amber (`#D97706`), statutory rose (`#DC2626`), and statutory emerald (`#059669`).
- **Disciplined Glassmorphism**: Translucent backdrops restricted strictly to floating surfaces (`glass--chrome`, `glass--card`, `glass--overlay`). Dense data tables reside on solid, high-contrast surfaces for visual clarity.
- **Accessible Motion Tokens**: Micro-animations (`.error-shake`, `.success-pop`, `.tilt-card`) paired with strict `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Simulation Flagging**: Whenever automated banking tests or simulator adapters are engaged, a distinct diagonal hatch pattern (`hatch-simulation`) with a prominent `[SIMULATION]` badge is displayed.

---

## 🧩 Delivered Core Modules (All 6 Phases)

### 1. Statutory UI Components (`src/components/ui/`)
- `TrustBadge.tsx`: Visual verification indicator (`SUBMITTED`, `STAFF_VERIFIED`, `BANK_CONFIRMED`, and simulation hatched variant).
- `LienBadge.tsx`: Displays statutory lien inscription status (`NOT_MARKED`, `MARKED`, `CONFIRMED`, `RELEASED`, `INVOKED`) with bank reference.
- `CountdownChip.tsx`: Dynamic countdown badge (<15d critical red, <60d warning amber, >60d safe neutral, overdue indicator).
- `StageTracker.tsx`: Interactive 5-stage consensus ribbon displaying SLA countdowns and completion checkmarks.
- `DocumentViewer.tsx`: Encrypted document viewer displaying AES-256 certificate status and version stamps.
- `KPICard.tsx`: Interactive metric card with tabular monospace typography, subtle 3D hover tilt, and drilldown callbacks.
- `ConfirmDialog.tsx`: Modal for statutory confirmations and destructive actions requiring mandatory audit justification.
- `StyleGuidePage.tsx`: Live design token and statutory component reference gallery (`/styleguide`).

### 2. Authentication & API Layer (`src/lib/api-client.ts`, `src/features/auth/`)
- Typed API client with automatic token refresh rotation (`/auth/refresh`) on 401 responses.
- Quick-fill login selector for all 5 official test personas.
- Role-scoped sidebar and topbar with live notification bells, role switcher, and unread counters.

### 3. Institution Portal (`src/features/fdrs/`, `src/features/renewals/`, `src/features/releases/`)
- **FDR Instruments Docket**: Filterable directory with statutory badges and countdown chips.
- **Deposit Filing**: Type-aware input forms with file upload and encrypted receipt attachment.
- **Instrument Detail**: Full parameter inspection, renewal request launch, and active regulatory hold warnings.
- **Renewal Petition Modal**: Side-by-side Old vs New comparison card embedded in extension filings.
- **Release Relinquishment**: 5-office workflow visualization, NOC Sanction Order download, and hold blocking lock.

### 4. Reviewer & Approver Compliance Desks (`src/features/verification/`, `src/features/holds/`)
- **Verification Queue**: Tabbed scrutiny pipeline (Pending, Discrepancies, Verified).
- **Verification Desk**: Parameter reconciliation matrix, Direct SFMS Bank Verification simulation trigger, Lien Inscription updater, and `DocumentViewer`.
- **Regulatory Holds Desk (`/holds`)**: Freeze order directory, Impose Hold modal (Approver/Admin), and Clear Hold modal with mandatory audit remarks.

### 5. Administration, Oversight & Dashboard (`src/features/dashboard/`, `src/features/settings/`, `src/features/import/`)
- **Central Compliance Dashboard (`/dashboard`)**:
  - Export Bar: One-click CSV extraction for Active, Matured, and Discrepant instruments with audit watermark.
  - 6 Interactive Top KPI Cards: Active Deposits, Expiring (30d), Overdue Matured, Pending Verification, Renewals Pending, Release Requests.
  - 5 Operational SLA Metric Cards: Avg Verification Time, Discrepancies Flagged, Reminders Dispatched, Cases Beyond SLA, Missing Documents.
  - Interactive Drill-Down Modal: Direct tabular inspection wired to all 6 backend endpoints (`trust-level`, `expiry-band`, `stuck-stages`, `missing-documents`, `active-holds`, `unconfirmed-liens`).
- **Statutory Settings Editor (`/settings`)**: Configurator for `REMINDER_THRESHOLDS`, `ESCALATION_SLA_HOURS`, `ADAPTER_MODE`, with APH Handbook reference defaults.
- **Bulk CSV Ingestion (`/import`)**: Drag-and-drop file dropzone, dry-run validation preview table, row-level error reporting, and commit mechanism.
- **Regulatory Audit Log (`/audit`)**: Filterable timeline of all official actions with actor, IP, timestamp, and diff viewer.

---

## 🔑 Demo Personas & Credentials

The application connects directly to the backend seeded database (`dev.db`). Use the quick-fill buttons on the login screen or these credentials:

| Persona | Email | Password | Role | Institution / Bureau |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Rajesh Sharma** | `principal@iiitm-delhi.ac.in` | `password123` | `INSTITUTION_USER` | IIITM Delhi |
| **Dr. Sunita Patil** | `registrar@vjti-mumbai.edu.in` | `password123` | `INSTITUTION_USER` | VJTI Mumbai |
| **Anil Kumar Verma** | `reviewer@aicte.gov.in` | `password123` | `REVIEWER` | Regional Office Scrutiny Desk |
| **Dr. M. S. Radhakrishnan** | `approver@aicte.gov.in` | `password123` | `APPROVER` | Approval Bureau |
| **Vikramaditya Singh** | `vigilance@aicte.gov.in` | `password123` | `REVIEWER` | Vigilance Cell |
| **S. K. Deshmukh** | `admin@aicte.gov.in` | `password123` | `ADMIN` | AICTE National Registry HQ |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### 2. Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
# Backend server runs on http://localhost:5000/api/v1
```

### 3. Frontend Setup
```bash
# In the repository root:
npm install
npm run dev
# Frontend dev server runs on http://localhost:5173
```

### 4. Build & Production Verification
```bash
npm run build
# Runs type check (tsc -b) and Vite bundle generation
```

---

## 🧪 Demonstration Workflows

### Scenario 1: New Instrument Filing to Bank Verification Handshake
1. Log in as **Dr. Rajesh Sharma** (`principal@iiitm-delhi.ac.in` / `password123`).
2. Navigate to **FDR Instruments** ➔ **Register New Instrument**.
3. Fill in deposit details, upload an encrypted receipt, and submit.
4. Log out and log in as **Anil Kumar Verma** (`reviewer@aicte.gov.in` / `password123`).
5. Open **Verification Queue**, locate the newly submitted instrument, and click **Examine**.
6. Inspect the parameter reconciliation matrix and attached documents in `DocumentViewer`.
7. Click **Run SFMS Check (Simulated)** to perform a simulated banking handshake. Observe the `[SIMULATION]` badge with diagonal hatching.
8. Click **Verify Instrument**, add official remarks, and confirm.

### Scenario 2: Regulatory Hold Freezing Release Petitions
1. Log in as **Dr. M. S. Radhakrishnan** (`approver@aicte.gov.in` / `password123`).
2. Navigate to **Regulatory Holds** (`/holds`) ➔ **Impose Regulatory Hold**.
3. Select an institution, choose source body (`CENTRAL_VIGILANCE_COMMISSION`), enter hold justification, and confirm.
4. Log in as the affected institution user (`principal@iiitm-delhi.ac.in` / `password123`).
5. Navigate to **Release & Refund** (`/releases`) or an active instrument detail page.
6. Observe the prominent red Regulatory Hold Banner indicating that release petitions are legally frozen.

### Scenario 3: Executive Dashboard & Drill-Down Analysis
1. Log in as **S. K. Deshmukh** (`admin@aicte.gov.in` / `password123`).
2. On the **Dashboard**, click any KPI card:
   - Click **Expiring (30 Days)** to open the drilldown drawer for upcoming maturities.
   - Click **Active Discrepancies** to view frozen institutions.
   - Click **Cases Beyond SLA** to view stuck inter-office stages.
3. Test the **Statutory Audit & Regulatory Export Bar** by clicking **Export Active FDRs** to download a CSV export.

---

## 📥 Demo Statutory Documents (Download & Test)

Pre-generated, high-fidelity PDF documents are provided for testing the **Pre-Submission Verification Gate** on the **Add Instrument (`/fdrs/new`)** page. These files contain embedded uncompressed text layers compatible with the server's in-memory extraction engine (`pdf-parse` / OCR).

### 1. Statutory Passing Documents (Full Compliance)
Upload these four files to pass all statutory pre-submission checks and core banking simulation:

| Required Slot | Document Name & Description | Local File Link | Web Server Direct Download |
| :--- | :--- | :--- | :--- |
| **`FDR_CERTIFICATE`** | **State Bank of India Fixed Deposit Receipt**<br/>Ref: `FDR/SBI/2026/DEMO-PASS` • ₹1,00,00,000 • IIITM Delhi | [01_FDR_Certificate_PASS.pdf](./demo-documents/01_FDR_Certificate_PASS.pdf) | [Download via Browser](http://localhost:5173/demo-documents/01_FDR_Certificate_PASS.pdf) |
| **`BANK_CONFIRMATION_LETTER`** | **Official SBI Bank Confirmation Letter**<br/>Ref: `SBI/OKHLA/AICTE/CONF/2025/084` • Okhla Phase 3 | [02_Bank_Confirmation_Letter_PASS.pdf](./demo-documents/02_Bank_Confirmation_Letter_PASS.pdf) | [Download via Browser](http://localhost:5173/demo-documents/02_Bank_Confirmation_Letter_PASS.pdf) |
| **`LIEN_ENDORSEMENT`** | **Certificate of Statutory Lien Endorsement**<br/>Lien marked in favor of Member Secretary, AICTE | [03_Lien_Endorsement_Letter_PASS.pdf](./demo-documents/03_Lien_Endorsement_Letter_PASS.pdf) | [Download via Browser](http://localhost:5173/demo-documents/03_Lien_Endorsement_Letter_PASS.pdf) |
| **`INSTITUTION_REQUEST_LETTER`** | **IIITM Delhi Submission Request Letter**<br/>Signed by Principal on letterhead • PID: `1-10023412` | [04_Institution_Request_Letter_PASS.pdf](./demo-documents/04_Institution_Request_Letter_PASS.pdf) | [Download via Browser](http://localhost:5173/demo-documents/04_Institution_Request_Letter_PASS.pdf) |

### 2. Statutory Negative Test Cases (Demonstrating Gate Rejection)
Use these documents to observe server-enforced **HTTP 409 Conflict** gate rejections and blocker panels:

| Test Scenario | Document Name | Failure Cause | Local File Link | Web Server Download |
| :--- | :--- | :--- | :--- | :--- |
| **Amount Mismatch** | `01_FDR_Certificate_AMOUNT_MISMATCH.pdf` | Certificate states ₹50,00,000 while form declared ₹1,00,00,000 | [View File](./demo-documents/test-cases/01_FDR_Certificate_AMOUNT_MISMATCH.pdf) | [Download](http://localhost:5173/demo-documents/test-cases/01_FDR_Certificate_AMOUNT_MISMATCH.pdf) |
| **Name Mismatch** | `02_FDR_Certificate_NAME_MISMATCH.pdf` | Depositor stated as *"Completely Unrelated Private Corporation Pvt Ltd"* (<25% fuzzy match) | [View File](./demo-documents/test-cases/02_FDR_Certificate_NAME_MISMATCH.pdf) | [Download](http://localhost:5173/demo-documents/test-cases/02_FDR_Certificate_NAME_MISMATCH.pdf) |
| **Bank NOT_FOUND** | `03_FDR_Certificate_UNKNOWN_BANK_REF.pdf` | FDR Reference `FDR/SBI/2026/UNKNOWN-9999` not registered in core banking simulation table | [View File](./demo-documents/test-cases/03_FDR_Certificate_UNKNOWN_BANK_REF.pdf) | [Download](http://localhost:5173/demo-documents/test-cases/03_FDR_Certificate_UNKNOWN_BANK_REF.pdf) |

### 3. How to Test on the Web Portal:
1. Log in as **Dr. Rajesh Sharma** (`principal@iiitm-delhi.ac.in` / `password123`).
2. Go to **FDR Instruments** ➔ **Register New Instrument** (`/fdrs/new`).
3. **Step 1 (Details)**: Set Reference Number to `FDR/SBI/2026/DEMO-PASS`, Bank to `State Bank of India`, Branch to `Okhla Phase 3`, Amount to `₹1,00,00,000`, Issue Date to `01/01/2025`, Maturity Date to `01/01/2030`. Click **Save & Proceed to Documents**.
4. **Step 2 (Documents)**: Upload the 4 passing documents into their respective slots. Notice the extraction status chips transition from `Reading` ➔ `Done`.
5. **Step 3 (Cross-Check)**: View the 4-way cross-check table verifying matching form, certificate, bank letter, and receipt values.
6. **Step 4 (Bank Verification)**: Click **Re-Query Bank Gateway** to verify against the core banking simulation. Notice the `[SIMULATION]` hatched badge.
7. **Step 5 (Submit)**: Notice all blockers are cleared and the **Submit to Statutory Registry** button is unlocked.

---

## 📜 Compliance Standards
- Built strictly to specifications outlined in AICTE Problem Statement 26265.
- Compliant with AICTE Approval Process Handbook (APH) deposit lock-in guidelines.
- Strict WCAG AA contrast standards and `prefers-reduced-motion` accessibility support.

