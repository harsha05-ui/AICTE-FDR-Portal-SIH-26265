# Comprehensive Frontend Audit — AICTE FDR Portal

**Date:** October 26, 2026  
**Auditor:** Antigravity AI  
**Scope:** Frontend Presentation Layer Inspection (`src/`, `index.html`, `tailwind.config.js`)  
**Specification:** `DESIGN.md` (Targeting Orbbitly reference model: https://sweet-process-405623.framer.app/)

---

## 1. Stack Overview

| Dimension | Technology & Version | Details / Role in Project |
|---|---|---|
| **Core Framework** | React 19.3.1 + TypeScript 6.0.3 | Functional components, hooks, strict TS types |
| **Build Tool & Bundler** | Vite 8.3.4 (with `@vitejs/plugin-react` 6.1.2) | Fast ESM dev server on `http://localhost:5173/` |
| **Routing** | React Router DOM v7 (7.18.4) | Data router with `createBrowserRouter`, `RouteGuard`, `<Outlet />`, `useNavigate`, `useSearchParams` |
| **Data Fetching & Cache** | TanStack Query v5 (5.104.5) | Query caching, automatic polling (30s on dashboard & notifications), mutations, optimistic updates |
| **Styling & CSS** | Tailwind CSS 3.4.19 + PostCSS 8.5.31 + Autoprefixer 10.6.1 | Custom HSL token extensions in `tailwind.config.js` and `src/styles/` |
| **Component Libraries** | None (Custom primitives built on standard DOM) | Internal custom design system (`src/components/ui/`, `src/components/tables/`) |
| **Icon Library** | Lucide React 1.61.0 | SVG icons across sidebar, buttons, table headers, status indicators |
| **Form Management & Validation** | React Hook Form 7.90.0 + Zod 4.6.7 + `@hookform/resolvers` 3.10.0 | Schema validation for Login, New FDR submission, and multi-step forms |
| **Charts & Visualizations** | Recharts 3.10.1 | Installed in dependencies (available for SLA metrics & trends) |
| **Animation Libraries** | Custom CSS transitions & keyframes (`src/styles/motion.css`) | No external heavy motion dependency; CSS transforms, opacity, and `requestAnimationFrame` for count-up |
| **CSS Utility Helpers** | `clsx` (2.1.1), `tailwind-merge` (3.7.0) | `cn()` utility in `src/lib/utils.ts` |
| **Code Quality / Linter** | Oxlint 1.88.0 | Fast Rust-based linter |
| **Typography Currently Loaded** | `Inter` (weights 400, 500, 600, 700) & `IBM Plex Mono` (400, 500, 600) | Loaded from Google Fonts in [index.html](file:///d:/SIH-26265/index.html#L9-L12). Monospace is overused on headings |

---

## 2. Shell & Layout Architecture

The application layout is centered in [src/components/layout/Shell.tsx](file:///d:/SIH-26265/src/components/layout/Shell.tsx):

- **Shell (`Shell.tsx`)**:
  - Encapsulates `<Sidebar />`, `<Topbar />`, `<CommandPalette />`, and an `<Outlet />` wrapped in a `<main>` tag.
  - Currently uses a scrolling container: `<div className="min-h-screen flex flex-col antialiased">` with `<main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8">`.
  - **Issue vs Spec:** Currently allows page-level scrolling. Needs refactoring to a fixed viewport shell (`100dvh`, sidebar + topbar fixed, page body strictly `100dvh - 56px`, zero outer scrollbar, internal panel scroll only).
- **Sidebar ([Sidebar.tsx](file:///d:/SIH-26265/src/components/layout/Sidebar.tsx))**:
  - Collapsible navigation drawer (expanded `w-64`, collapsed `w-20`).
  - Mobile drawer via `mobileOpen` state.
  - Contains navigation groups: `CORE COMPLIANCE`, `LIFECYCLE OPERATIONS`, `OVERSIGHT & AUDIT`.
  - Filters navigation links dynamically based on user role (`INSTITUTION_USER`, `REVIEWER`, `APPROVER`, `ADMIN`, `AICTE_OFFICIAL`, `AICTE_ADMIN`).
  - Has a placeholder box logo reading `"AICTE"` with hard-coded text, which looks cropped/clunky.
- **Topbar ([Topbar.tsx](file:///d:/SIH-26265/src/components/layout/Topbar.tsx))**:
  - Breadcrumbs component (`Breadcrumbs.tsx`), quick search button opening `CommandPalette`, theme switcher toggle, notifications popover bell with unread badge, and user persona menu with role switcher and logout.
- **Command Palette ([CommandPalette.tsx](file:///d:/SIH-26265/src/components/layout/CommandPalette.tsx))**:
  - Global hotkey `⌘K` / `Ctrl+K`.
  - Allows quick search over routes, FDR reference numbers, institutions, and quick role switching.
- **Page Header ([PageHeader.tsx](file:///d:/SIH-26265/src/components/layout/PageHeader.tsx))**:
  - Provides page title, subtitle, and primary actions slot.

---

## 3. Page Inventory & Components Used

| Route | Page File | Allowed Roles | Components Used | Purpose |
|---|---|---|---|---|
| `/login` | [LoginPage.tsx](file:///d:/SIH-26265/src/features/auth/LoginPage.tsx) | Public / All | `GlassSurface`, `Field`, `Input`, `Button`, Lucide icons (`Lock`, `Mail`, `AlertCircle`, `ArrowRight`, `ShieldCheck`) | Main authentication entry screen, credential validation, quick persona switcher |
| `/unauthorized` | [UnauthorizedPage.tsx](file:///d:/SIH-26265/src/features/auth/UnauthorizedPage.tsx) | All | `Card`, `Button`, `ShieldAlert` | Error fallback for insufficient role access |
| `/dashboard` | [DashboardPage.tsx](file:///d:/SIH-26265/src/features/dashboard/DashboardPage.tsx) | All authenticated roles | `KPICard`, `Badge`, `TrustBadge`, `CountdownChip`, `Button`, `Skeleton`, `Dialog`, `Toast` | Central compliance overview, statutory counts, SLA metrics panel, quick export bar, drilldown modals |
| `/fdrs` | [FDRListPage.tsx](file:///d:/SIH-26265/src/features/fdrs/FDRListPage.tsx) | All roles | `PageHeader`, `Button`, `Badge`, `TrustBadge`, `LienBadge`, `CountdownChip`, `DataTable`, `FilterBar`, `Pagination`, `Toast` | Searchable, filterable list of all security deposit instruments and FDRs |
| `/fdrs/new` | [NewFDRPage.tsx](file:///d:/SIH-26265/src/features/fdrs/NewFDRPage.tsx) | `INSTITUTION_USER` | `PageHeader`, `Card`, `Button`, `Input`, `Select`, `Field`, `CurrencyInput`, `DateField`, `PreSubmissionCheckTable`, `Toast` | Multi-step instrument registration form with client-side AICTE compliance pre-checks |
| `/fdrs/:id` | [FDRDetailPage.tsx](file:///d:/SIH-26265/src/features/fdrs/FDRDetailPage.tsx) | All roles | `PageHeader`, `Card`, `Button`, `Badge`, `TrustBadge`, `LienBadge`, `CountdownChip`, `Dialog`, `FileDropzone`, `PreSubmissionCheckTable`, `Skeleton`, `ErrorState`, `Toast` | Detailed docket of an FDR: metadata, bank confirmation status, documents, pre-check verification, action buttons |
| `/institutions` | [InstitutionListPage.tsx](file:///d:/SIH-26265/src/features/institutions/InstitutionListPage.tsx) | Officials (`REVIEWER`, `APPROVER`, `ADMIN`, etc.) | `PageHeader`, `Card`, `Input`, `Select`, `Badge`, `Button`, `DataTable` | List of technical institutions, search by permanent ID, city, state, type |
| `/institutions/:id` | [InstitutionDetailPage.tsx](file:///d:/SIH-26265/src/features/institutions/InstitutionDetailPage.tsx) | Officials | `PageHeader`, `Card`, `Button`, `Badge`, `Tabs`, `DataTable`, `Skeleton`, `ErrorState` | Profile of an institution, list of its FDRs, audit history, active regulatory holds |
| `/verification` | [VerificationListPage.tsx](file:///d:/SIH-26265/src/features/verification/VerificationListPage.tsx) | `REVIEWER`, `ADMIN`, `AICTE_OFFICIAL` | `PageHeader`, `Tabs`, `Badge`, `RiskBadge`, `Button`, `DataTable`, `Input`, `TrustBadge`, `LienBadge`, `CountdownChip` | Scrutiny work queue tabbed by Pending, Discrepancy, Verified |
| `/verification/:id` | [VerificationDeskPage.tsx](file:///d:/SIH-26265/src/features/verification/VerificationDeskPage.tsx) | Reviewers | `PageHeader`, `Card`, `Button`, `Badge`, `RiskBadge`, `Dialog`, `Field`, `TrustBadge`, `LienBadge`, `CountdownChip`, `DocumentViewer`, `PreSubmissionCheckTable`, `Skeleton`, `ErrorState` | Split scrutiny desk with live PDF viewer, OCR comparison, lien status toggle, approve/discrepancy decision |
| `/renewals` | [RenewalPage.tsx](file:///d:/SIH-26265/src/features/renewals/RenewalPage.tsx) | All roles | `PageHeader`, `Card`, `Button`, `Badge`, `Dialog`, `Field`, `Input`, `Select`, `CurrencyInput`, `DateField`, `DataTable` | Renewal petition submission (institution) and approval/decline review desk (approver) |
| `/releases` | [ReleasePage.tsx](file:///d:/SIH-26265/src/features/releases/ReleasePage.tsx) | All roles | `PageHeader`, `Card`, `Button`, `Badge`, `StageTracker`, `Dialog`, `Field`, `Input`, `Select`, `CurrencyInput`, `DataTable` | Multi-office 5-stage release review desk, stage progression tracking, sanction order PDF download |
| `/notifications` | [NotificationListPage.tsx](file:///d:/SIH-26265/src/features/notifications/NotificationListPage.tsx) | All roles | `PageHeader`, `Card`, `Button`, `Badge`, `EmptyState` | List of compliance alerts, reminders, and unread notifications |
| `/reports` | [ReportsPage.tsx](file:///d:/SIH-26265/src/features/reports/ReportsPage.tsx) | Officials | `PageHeader`, `Card`, `Button`, `Select`, `Tabs`, `Badge`, `DateField`, `DataTable` | Tabbed statutory reports, dynamic filters, instant CSV export with watermark |
| `/audit` | [AuditPage.tsx](file:///d:/SIH-26265/src/features/audit/AuditPage.tsx) | `ADMIN`, `AICTE_ADMIN` | `PageHeader`, `Card`, `Input`, `Button`, `Dialog`, `DataTable` | Immutable regulatory event log, actor details, JSON payload viewer, manual maturity check trigger |
| `/holds` | [HoldsPage.tsx](file:///d:/SIH-26265/src/features/holds/HoldsPage.tsx) | `APPROVER`, `ADMIN` | `PageHeader`, `Card`, `Button`, `Dialog`, `Field`, `Input`, `Select`, `DataTable` | Regulatory holds dashboard, place hold, clear hold with justification |
| `/settings` | [SettingsPage.tsx](file:///d:/SIH-26265/src/features/settings/SettingsPage.tsx) | `ADMIN`, `AICTE_ADMIN` | `PageHeader`, `Card`, `Button`, `Input`, `Field` | System configuration (SLA threshold hours, default lock-in years, reminder notice days) |
| `/import` | [ImportPage.tsx](file:///d:/SIH-26265/src/features/import/ImportPage.tsx) | `ADMIN`, `AICTE_ADMIN` | `PageHeader`, `Card`, `Button` | Bulk CSV deposit ingestion, two-stage dry-run validation table and commit |
| `/ocr` | [OCRPage.tsx](file:///d:/SIH-26265/src/features/ocr/OCRPage.tsx) | All roles | `PageHeader`, `Card`, `Button`, `Badge`, `FileDropzone` | Standalone OCR visual test harness, confidence breakdown, field match comparison |
| `/styleguide` | [StyleGuidePage.tsx](file:///d:/SIH-26265/src/features/styleguide/StyleGuidePage.tsx) | Admin | Design token demo widgets | Internal UI showcase of buttons, badges, chips, inputs |

---

## 4. Component Inventory & Quality Assessment

| Component | Path | Used For | Current Style / Smells | Redesign Target |
|---|---|---|---|---|
| **`KPICard`** | `src/components/ui/KPICard.tsx` | Metrics on Dashboard & Detail views | **Smell:** 3D perspective mouse tilt, radial glare gradient, all-caps monospace titles, tinted color cards (`bg-emerald-50`, `bg-amber-50`), corner `ArrowUpRight` arrow | Pure neutral white card, 1px subtle hairline border, soft hover lift, small sentence-case label, large tabular numbers, tiny semantic status dot |
| **`Badge`** / Status Chips | `src/components/ui/Badge.tsx` | Status displays across tables & dockets | Mixed styles, uppercase labels, varying radius | Standard rounded-full pill chip, quiet pastel background, status dot, sentence-case text |
| **`TrustBadge`** | `src/components/ui/TrustBadge.tsx` | Four-tier trust level indicator (Submitted, Verified, Confirmed, Simulation) | Monospace uppercase badges | Refined status pill with micro dot |
| **`CountdownChip`** | `src/components/ui/CountdownChip.tsx` | Days to maturity countdown pill | Coloured borders with urgency levels | Minimal tabular numerical pill with subtle status dot |
| **`DataTable`** | `src/components/tables/DataTable.tsx` | Primary data display across all queues | Table with borders, basic hover | Sticky header, tabular numerals, right-aligned monetary amounts, hairline dividers, designed empty/loading skeleton states |
| **`FilterBar`** | `src/components/tables/FilterBar.tsx` | Search and dropdown filters | Basic input and select wrapper | Unified height (`36px` or `40px`), matching radii, clean search icon |
| **`Pagination`** | `src/components/tables/Pagination.tsx` | Table pagination controls | Text buttons | Compact pagination pills with subtle border |
| **`Button`** | `src/components/ui/Button.tsx` | Actions throughout the portal | Multiple one-off background colors (`bg-blue-600`, `bg-emerald-600`, `bg-purple-600`) | Standardized button tiers: **Primary** (high-contrast solid), **Secondary** (hairline outline), **Ghost**. One primary per view |
| **`Input` & `Select`** | `src/components/ui/Input.tsx`, `Select.tsx` | Form controls | Inconsistent heights, standard browser appearance | Consistent radius (`8px`), 1px border `#e2e8f0`, subtle focus ring |
| **`Dialog`** | `src/components/ui/Dialog.tsx` | Modals for decisions, approvals, uploads | Standard floating modal | Framer-style modal with smooth backdrop fade and upward settle |
| **`Tabs`** | `src/components/ui/Tabs.tsx` | Tabbed view controller | Basic underline or box tabs | Animated sliding pill/underline indicator, smooth cross-fade with 6-8px settle |
| **`StageTracker`** | `src/components/ui/StageTracker.tsx` | 5-stage release consensus visualizer | Multi-step progress bar | Clean linear stage progression with status dots and timestamps |
| **`DocumentViewer`** | `src/components/ui/DocumentViewer.tsx` | Split-screen PDF inspection | Embedded iframe / viewer | Polished preview drawer with zoom/download chrome |
| **`EmptyState` / `ErrorState`** | `src/components/feedback/` | Blank & error handling | Basic boxes | Premium designed states with quiet icons and clear recovery buttons |
| **`GlassSurface`** | `src/components/glass/GlassSurface.tsx` | Container wrapper | **Smell:** Heavy backdrop-blur, tinted glass layers | Replace with crisp solid white / neutral surfaces with 1px border |

---

## 5. Data Bindings Map ("Do Not Break" List)

Every backend API method currently called by frontend components is listed below. **None of these endpoints, payloads, or hooks may be altered or broken during the visual redesign.**

| Page / Component | React Query Key / Hook | API Method | Endpoint & Method | Consumed Data & UI Impact |
|---|---|---|---|---|
| **App / Shell** | `useAuth()` | `api.auth.getCurrentUser()` | `GET /auth/me` | Current user session, role, designation |
| **App / Shell** | `['notifications']` | `api.notifications.list()` | `GET /notifications` | Bell icon unread badge, notification dropdown |
| **Shell** | Mutation | `api.notifications.markRead(id)` | `POST /notifications/:id/read` | Clears unread badge for single item |
| **Shell** | Mutation | `api.notifications.markAllRead()` | `POST /notifications/mark-all-read` | Marks all notifications as read |
| **Login** | Form Submit | `api.auth.login(email, password)` | `POST /auth/login` | Authenticates user, receives JWT & user object |
| **Dashboard** | `['dashboard-summary']` | `api.dashboard.getSummary()` | `GET /dashboard/summary` | Top statutory counts, priority queue table, SLA metrics panel |
| **Dashboard** | `['drilldown', metric, params]` | `api.dashboard.getDrilldown(metric, params)` | `GET /dashboard/drilldown/:type` | Populates modal when any KPI card is clicked |
| **Dashboard** | Click Export | `api.reports.downloadCsv(params)` | `GET /reports/fdrs?format=csv` | Immediate CSV download with watermark |
| **Dashboard / Audit** | Mutation | `api.admin.runMaturityCheck()` | `POST /admin/run-maturity-check` | Runs automated maturity evaluation and SLA alert job |
| **FDR List** | `['fdrs', filters]` | `api.fdrs.list(params)` | `GET /fdrs` | Main instruments table, status chips, countdowns |
| **FDR Detail** | `['fdr', id]` | `api.fdrs.getById(id)` | `GET /fdrs/:id` | Full instrument details, metadata, status, history |
| **FDR Detail** | `['fdr-precheck', id]` | `api.fdrs.getPrecheck(id)` | `GET /fdrs/:id/precheck` | Automated statutory rules evaluation table |
| **FDR Detail** | Mutation | `api.fdrs.runPrecheck(id)` | `POST /fdrs/:id/precheck` | Re-executes automated rules validation |
| **FDR Detail** | Mutation | `api.fdrs.uploadDocument(id, file, ...)` | `POST /fdrs/:id/documents` | Uploads FDR certificate or bank confirmation |
| **FDR Detail** | Download | `api.fdrs.downloadDocument(id, name)` | `GET /documents/:id/download` | Downloads attached compliance certificate |
| **FDR Detail** | Mutation | `api.fdrs.submit(id)` | `POST /fdrs/:id/submit` | Transitions draft FDR to `SUBMITTED` |
| **FDR Detail** | Mutation | `api.fdrs.bankVerify(id, payload)` | `POST /fdrs/:id/bank-verify` | Simulates or runs bank API validation |
| **New FDR** | `['institutions']` | `api.institutions.list()` | `GET /institutions` | Populates institution dropdown |
| **New FDR** | `['required-slots', type]` | `api.fdrs.getRequiredSlots(type)` | `GET /documents/required-slots` | Document slot definitions for instrument type |
| **New FDR** | Mutation | `api.fdrs.create(data)` | `POST /fdrs` | Registers new security deposit in database |
| **Institutions List** | `['institutions']` | `api.institutions.list(params)` | `GET /institutions` | Institutions grid/table |
| **Institution Detail** | `['institution', id]` | `api.institutions.getById(id)` | `GET /institutions/:id` | Header details, permanent AICTE ID |
| **Institution Detail** | `['fdrs', { institutionId }]`| `api.fdrs.list({ institutionId })` | `GET /fdrs?institutionId=:id` | Instruments held by this technical institution |
| **Institution Detail** | `['audit']` | `api.audit.list()` | `GET /audit-logs` | Institution compliance events audit trail |
| **Verification Queue**| `['fdrs']` | `api.fdrs.list()` | `GET /fdrs` | Reviewer work queue filtered by status |
| **Verification Desk** | `['fdr', id]` | `api.fdrs.getById(id)` | `GET /fdrs/:id` | Instrument and OCR verification view |
| **Verification Desk** | Mutation | `api.fdrs.verify(id, payload)` | `POST /fdrs/:id/verify` | Approves or flags instrument with discrepancy remarks |
| **Verification Desk** | Mutation | `api.fdrs.updateLien(id, payload)` | `PATCH /fdrs/:id/lien` | Updates bank lien status (`CONFIRMED`, `UNCONFIRMED`) |
| **Renewals** | `['renewals']` | `api.renewals.list()` | `GET /renewals` | Renewal requests table |
| **Renewals** | Mutation | `api.renewals.create(fdrId, data)` | `POST /fdrs/:fdrId/renewals` | Submits extension petition |
| **Renewals** | Mutation | `api.renewals.decision(id, payload)` | `POST /renewals/:id/decision` | Approves or declines renewal petition |
| **Releases** | `['release-requests']` | `api.releases.list()` | `GET /release-requests` | 5-stage release review queue |
| **Releases** | Mutation | `api.releases.create(fdrId, data)` | `POST /fdrs/:fdrId/release-requests` | Submits refund petition |
| **Releases** | Mutation | `api.releases.stageAction(...)` | `POST /release-requests/:id/stages/:sId/action` | Advances stage approval across councils |
| **Releases** | Mutation | `api.releases.decision(id, payload)` | `POST /release-requests/:id/decision` | Final release sanction approval |
| **Releases** | Download | `api.releases.downloadOrder(id)` | `GET /release-requests/:id/order` | Downloads Council Sanction Order / NOC PDF |
| **Reports** | `['reports-fdrs', ...]` | `api.reports.getFdrs(params)` | `GET /reports/fdrs` | Live filtered report tabular result |
| **Reports** | Download | `api.reports.downloadCsv(params)` | `GET /reports/fdrs?format=csv` | Filtered report CSV file download |
| **Audit Log** | `['audit']` | `api.audit.list(params)` | `GET /audit-logs` | Immutable audit trail records table |
| **Regulatory Holds** | `['holds', status]` | `api.holds.list(params)` | `GET /holds` | List of active and cleared regulatory holds |
| **Regulatory Holds** | Mutation | `api.institutions.createHold(id, data)` | `POST /institutions/:id/holds` | Places hold on an institution |
| **Regulatory Holds** | Mutation | `api.holds.clear(id, data)` | `POST /holds/:id/clear` | Revokes hold with audit remarks |
| **Settings** | `['settings']` | `api.settings.list()` | `GET /settings` | Policy parameters table |
| **Settings** | Mutation | `api.settings.update(key, value)` | `PUT /settings/:key` | Updates policy parameter |
| **Bulk Import** | Mutation | `api.import.instruments(file, dryRun)` | `POST /import/instruments?dryRun=...` | Validates or commits bulk CSV deposit uploads |

---

## 6. Authentication & Entry Flow Audit

### Current State
1. **Entry Point**: Route `/login` handled by [LoginPage.tsx](file:///d:/SIH-26265/src/features/auth/LoginPage.tsx).
2. **Token Storage**:
   - Stored in `localStorage` under key `'aicte_jwt_token'`.
   - Also kept in memory in [src/lib/api-client.ts](file:///d:/SIH-26265/src/lib/api-client.ts).
   - Injected into HTTP headers as `Authorization: Bearer <token>`.
3. **Session Check**:
   - [AuthContext.tsx](file:///d:/SIH-26265/src/features/auth/AuthContext.tsx) calls `api.auth.getCurrentUser()` (`GET /auth/me`) on mount.
   - If invalid or expired, sets `user = null`.
   - Automatic 401 handling tries `POST /auth/refresh` once, then dispatches `aicte:unauthorized` to log out cleanly.
4. **Role Routing**:
   - `INSTITUTION_USER` redirects to `/fdrs`.
   - `REVIEWER` redirects to `/verification`.
   - `APPROVER` redirects to `/renewals`.
   - `ADMIN` / `AICTE_ADMIN` / `AICTE_OFFICIAL` redirects to `/dashboard`.
   - Respects `location.state.from` if user attempted to visit a protected route.
5. **What an Unauthenticated Visitor Sees Today**:
   - A plain, vertically-centered card on a gray background (`bg-slate-50`) with a basic form and 5 preset demo role buttons.
   - Lacks any product showcase, animation, or fintech elegance.

### Spec Requirements for Entry (Section 4A)
- **Single-Screen Split Layout** (no page scrolling, `100dvh` fixed).
- **Left Panel (~60%)**: Interactive animated product showcase recreating the reference hero window:
  - Looping 4-scene story: **1. Receive** (incoming submissions syncing) → **2. Extract** (OCR scan and field extraction) → **3. Verify** (rule check tick-off and exception flag) → **4. Decide** (reviewer approval and audit log).
  - Step indicator dots, autoplay (5–6s per scene), pause on hover/focus, click to jump.
  - Reduced-motion fallback (static finished scene).
  - First-time entry build-in animation; return visitors skip build-in.
- **Right Panel (~40%)**: Clean login card with uncropped AICTE emblem, "FDR Portal · Govt. of India", same form fields and credentials, show/hide password toggle, loading spinner on submit, inline error messages.
- **Seamless Exit Transition**: On successful login, showcase panel slides left and dissolves, login card fades, and dashboard shell animates in.
- **Unchanged Backend Contract**: Zero change to `api.auth.login()`, roles, or token keys.

---

## 7. "Vibe-Coded" Smells Identified

| Issue | Affected File(s) & Line(s) | Impact / Required Correction |
|---|---|---|
| **ALL-CAPS Monospace Labels** | `src/features/dashboard/DashboardPage.tsx` (L150, L368)<br>`src/components/ui/KPICard.tsx` (L164)<br>`src/components/layout/Sidebar.tsx` (L62, L91, L120) | Change to sentence case sans-serif typography (`font-sans text-xs font-medium text-slate-500`). Remove monospace headings. |
| **Translucent Tinted Cards & Borders** | `src/components/ui/KPICard.tsx` (L23–41: `bg-emerald-50/40`, `bg-amber-50/40`, `bg-rose-50/50`, `bg-sky-50/40`) | Replace with neutral white card surfaces (`bg-white border-slate-200`) and a subtle 2px/3px semantic status dot. |
| **3D Mouse Tilt & Glare Effects** | `src/components/ui/KPICard.tsx` (L57–160: `perspective(800px) rotateX(...)`, radial glare) | Strip tilt and glare completely. Replace with subtle 1–2px hover lift (`translate-y-[-1px]`) and soft shadow shift. |
| **Arrow-in-Corner Icons** | `src/components/ui/KPICard.tsx` (L175: `<ArrowUpRight />`)<br>Multiple list pages | Remove decorative corner arrows from cards. |
| **Heavy Dark Navy Hero Banner** | `src/features/dashboard/DashboardPage.tsx` (L147–207: `bg-navy-950 text-white rounded-lg p-5 sm:p-6`) | Replace with a calm, quiet page header (title, breadcrumb/tag, status, primary actions). |
| **Regulatory Copy Smells** | `src/features/dashboard/DashboardPage.tsx` (L154: `• Problem Statement PS-26265`)<br>`src/features/auth/LoginPage.tsx` (L87: `(SIH PS-26265)`) | Remove PS-26265 strings from user-facing chrome at presentation layer. |
| **Cropped AICTE Logo** | `src/components/layout/Sidebar.tsx` (L168)<br>`src/features/auth/LoginPage.tsx` (L80) | Replace hardcoded square AICTE text box with a crisp official seal/emblem SVG with proper proportions. |
| **Long Scrolling Page Shell** | `src/components/layout/Shell.tsx` (L51, L94) | Redesign shell into a non-scrolling `100dvh` container with fixed topbar and sidebar; only tab inner lists scroll. |
| **Export Bar Banner** | `src/features/dashboard/DashboardPage.tsx` (L223–258) | Replace wide horizontal banner with a single dropdown or segmented "Export" menu button. |

---

## 8. Risks & Mitigation Plan

1. **Risk: Breaking Filter or Query State during Tab Refactoring**  
   *Mitigation:* Keep URL search params (`useSearchParams`) intact for filters and pagination; wrap tabs inside the page component rather than changing router paths.
2. **Risk: Auth State Desynchronization**  
   *Mitigation:* Do not modify `AuthContext.tsx` or `api-client.ts`. The new split login screen in Phase 3A will use `login()` and `useAuth()` directly.
3. **Risk: Mobile Viewport Breaking on Fixed 100dvh Layout**  
   *Mitigation:* Use `100dvh` (dynamic viewport height) with overflow-y auto fallback on viewports `< 1024px` where vertical space is constrained.
4. **Risk: Form Validation Regressions**  
   *Mitigation:* Preserve React Hook Form and Zod schemas across all inputs and forms.

---

## 9. Proposed Phased Execution Plan

- **Phase 0:** Codebase audit & reference token extraction (Completed: `AUDIT.md` and `design-tokens.md`). **[STOP FOR APPROVAL]**
- **Phase 1:** Apply reference tokens to CSS variables and Tailwind config (`src/styles/tokens.css`, `tailwind.config.js`).
- **Phase 2:** Shell redesign (`Shell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, tabs navigation, fixed `100dvh`).
- **Phase 3:** Entry Screen (`LoginPage.tsx`) with animated 4-scene product showcase and split layout.
- **Phase 4:** Core UI component redesign (`KPICard`, `Badge`, `Button`, `DataTable`, `Dialog`, `Tabs`).
- **Phase 5:** Page-by-page transformation into tabbed views (Dashboard → Verification Desk → FDRs → Renewals → Releases → Reports → OCR).
- **Phase 6:** Polish, motion curves, reduced-motion accessibility, and QA build validation.
