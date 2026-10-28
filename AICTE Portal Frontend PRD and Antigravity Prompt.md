# AICTE Portal Frontend: PRD and Antigravity Prompt

Security Deposit and FDR Management Portal | SIH 2026 PS 26265 | Frontend redesign and backend integration | Draft

Two parts. **Part A** is the frontend PRD (design direction, screens, backend integration, motion). **Part B** is a ready-to-paste, phased prompt for Antigravity (or any coding agent) to upgrade your existing frontend.

I have not seen your frontend code, so the prompt makes the agent inspect it first and adapt to whatever framework it already uses. Endpoint names below come from the backend audit and the upgrade PRD. The agent must confirm them against the real backend (`src/modules/*` and `/api-docs`) and must not invent any.

# Part A: PRD

## 1. Purpose

The backend is built. The frontend must now be a professional, trustworthy regulator-grade interface that is wired directly to the real API, with no mock data in the live path. It should feel closer to a modern fintech or compliance product than to a typical government portal.

## 2. Design direction

**Personality:** calm, precise, authoritative. Closer to a banking or audit tool than a brochure. The interface carries sensitive money records, so it should feel stable and exact, not playful.

**What to avoid (the cheap or vibe-coded look)**

- Default purple-to-blue gradients, neon glows and gradient text on everything.
- Emoji as icons, stock illustrations, lorem ipsum, fake testimonials.
- Tricolour banners, tiled national emblems as decoration, crowded link bars, marquee text, clip-art, heavy borders and drop shadows.
- Glass on every surface, tilt on every card, animation on every element.
- Generic centred hero layouts and card grids with identical padding and no hierarchy.

**What to do**

- **Layout:** a left navigation rail, a slim top bar, and a content area with clear hierarchy. Dense but readable tables for officers, roomier layouts for institutions.
- **Colour:** a deep ink-navy base, a neutral cool-grey scale, and a single restrained accent. Semantic colours only for meaning: trust levels, deadlines, status. Provide light and dark themes from the same tokens.
- **Typography:** one humanist or grotesque sans for UI, a monospace for reference numbers and amounts, tabular numerals for all money and dates. Choose the pairing deliberately and load it with a sensible fallback stack.
- **Icons:** a single consistent line-icon set (for example Lucide). No emoji.
- **Spacing and shape:** an 4 or 8 px scale, consistent radii, hairline borders, subtle elevation.
- **Content:** real labels and real empty states written for the domain. No filler.

### Glassmorphism rules (disciplined use)

Use glass only on layers that float above content: the top bar, side panels, modals, popovers, toasts and the stage-tracker card. Place it over a quiet, low-contrast background (soft gradient mesh or subtle grain), never over busy content.

- `backdrop-filter: blur()` with a translucent tint and a 1 px light inner border.
- Text on glass must still meet WCAG AA contrast. Increase tint opacity if it does not.
- Provide a solid fallback where `backdrop-filter` is unsupported.
- Tables, forms and long text sit on solid surfaces, not glass.
- Disable heavy blur on low-power devices and when the user prefers reduced transparency.

### 3D and motion rules

- **3D** is for meaning, not decoration: a perspective page transition between sections, a subtle tilt and glare on summary cards, a depth effect when a modal or side panel opens, and a stage tracker that moves through space as a case advances.
- Keep tilt small (a few degrees), disable it on touch devices, and never use it on dense tables.
- Durations and easing come from shared motion tokens. No hard-coded one-off values.
- Every animation respects `prefers-reduced-motion` and falls back to a simple fade or no motion.
- Animate `transform` and `opacity` only. No layout-thrashing animations.
- Page content must never be blocked behind an animation. Interactions must stay under about 300 ms, page transitions under about 450 ms.

## 3. Component sources: transitions.dev and Originkit

**transitions.dev**

- A collection of reusable CSS transitions. Each uses `t-*` namespaced selectors, semantic CSS custom properties (motion tokens) and a `prefers-reduced-motion` guard, with small JS snippets where needed.
- Catalogue includes: card resize, number pop-in, notification badge, text and icon swaps, dropdown, modal, page slide, success check, error shake, skeleton loader, shimmer text, sliding tabs and segmented control, tooltip, staggered text reveal, card hover 3D tilt with glare, accordion, and a plus-to-menu morph. The exact count differs between sources, so the agent must list what is actually available.
- Install as an agent skill with `npx skills add Jakubantalik/transitions.dev`. Some transitions can be added with `npx transitions-pro add <name>`, and `npx transitions-pro list` shows what is available. Some are free without an account and some are Pro and need a login.
- The skill's commands are `transitions reveal`, `transitions review`, `transitions apply` and `transitions refine`. Use `refine` at the end to replace ad-hoc durations with motion tokens.

**Originkit**

- A free animated component library (copy the code, use in Framer, or connect via MCP). It supports React, Next.js, Vite and Framer, with CSS, Tailwind or CSS Modules styling. Browsing needs no key. Fetching source through MCP needs a free API key from originkit.dev under Settings, API Integration. If the key is not set up, the agent should ask you, not guess.
- Use it for **accents only**: animated backgrounds for the login page and empty states, text and number animations on dashboard KPIs, and subtle interactive touches. Do not put decorative components inside data tables or forms.

**Mapping**

| UI need | Source | Notes |
| --- | --- | --- |
| Modal, dropdown, tooltip, accordion | transitions.dev | Core interactions |
| Sliding tabs, segmented control | transitions.dev | Filters and view switches |
| Page slide / perspective route change | transitions.dev, adapted | Respect reduced motion |
| Card hover tilt and glare | transitions.dev | Dashboard and summary cards only |
| Number pop-in | transitions.dev | KPI counters and countdown chips |
| Notification badge | transitions.dev | Bell icon |
| Skeleton loader and shimmer | transitions.dev | Every loading state |
| Error shake, success check | transitions.dev | Form validation and approvals |
| Animated login background | Originkit | One restrained component |
| Text and number animation on hero KPIs | Originkit | Dashboard header only |
| Empty-state visuals | Originkit | Light touch |

If a needed component is Pro-only or unavailable, build a minimal equivalent on the same tokens and tell the user.

## 4. Technical requirements

- **Framework:** keep the existing one. If none exists, use React with TypeScript and Vite.
- **Styling:** CSS variables for tokens plus the existing styling approach (Tailwind or CSS Modules). Tokens for colour, type, spacing, radius, elevation, blur and motion.
- **Data layer:** a typed API client over the backend. Use TanStack Query (or the existing equivalent) for caching, loading and error states.
- **Forms:** react-hook-form with Zod schemas that mirror backend validation.
- **Routing:** role-based route guards and role-based redirect after login.
- **Accessibility:** WCAG 2.1 AA, full keyboard use, visible focus, labelled inputs, status never conveyed by colour alone.
- **Responsive:** laptop first, tablet supported, usable on mobile for institution users.
- **Performance:** route-level code splitting, lists under 2 seconds with a few hundred rows, pagination or virtualisation on large tables.
- **No mock data** in the live path. Demo data comes from the backend seed.

## 5. Backend integration contract

The agent must derive the real contract from the backend. Expected resources (confirm each):

| Area | Endpoints (expected) |
| --- | --- |
| Auth | POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/refresh |
| Institutions | GET and POST /institutions |
| Instruments | GET and POST /fdrs, GET and PATCH /fdrs/:id, POST /fdrs/:id/documents, POST /fdrs/:id/submit, POST /fdrs/:id/verify, POST /fdrs/:id/bank-verify, PATCH /fdrs/:id/lien |
| Renewals | POST /fdrs/:id/renewals, renewal routes under /renewals |
| Release | POST /fdrs/:id/release-requests, GET /release-requests/:id, stage action route, decision route, GET /release-requests/:id/order |
| Holds | GET /holds, POST /institutions/:id/holds, POST /holds/:id/clear |
| Documents | GET /documents/:id (download), GET /documents/:id/download-url |
| Notifications | GET /notifications, POST /notifications/:id/read |
| Dashboard and reports | GET /dashboard/summary and drill-downs, GET /reports/fdrs (JSON or CSV) |
| Settings and admin | GET /settings, PUT /settings/:key, admin routes, POST /import/instruments |
| Audit | GET /audit-logs |

**Integration rules**

- Base URL from an environment variable. Handle both the versioned `/api/v1` prefix and root aliases consistently.
- Keep the access token in memory. Use the refresh cookie flow if the backend provides it. Retry once on 401 after refresh, then log out.
- Money arrives as strings (Decimal). Format with the Indian digit grouping and a rupee symbol, never with floating-point maths.
- Map the backend error format (domain errors, Zod errors, 403, 404, 409) to clear, field-level messages. A 409 on a workflow action must show the reason from the server.
- The UI must never offer an action the server will reject by role or status. Hide or disable it with an explanation, but the server remains the authority.
- Trust level, lien status, lifecycle status and stage status are read-only in the UI except through the dedicated action endpoints.
- Simulated bank results must always be shown with a visible Simulation label.
- Reports and exports download through authenticated calls. Documents download through the signed-URL endpoint when available.

## 6. Information architecture and screens

### Shared

- **Login:** role-aware sign-in, rate-limit and error messages, an animated background used sparingly.
- **App shell:** glass top bar with search, notification bell and badge, theme switch, user menu. Left rail with role-specific navigation.
- **Components:** status badge, trust badge (three states with tooltip, and a hatched Simulation variant), lien badge, countdown chip (amber under 60 days, red under 15), timeline, stage tracker, document viewer with version history, confirmation dialog, toast, empty state, skeleton, data table with sorting, filters and pagination, filter bar, KPI card, drill-down links.

### Institution user

| Screen | Purpose |
| --- | --- |
| Home | My instruments, upcoming maturities, pending actions, recent notifications |
| My instruments | Table with status, trust badge, maturity date, days left |
| Add or edit instrument | Type-aware form with per-type required fields, document upload, lien claim, submit |
| Instrument detail | Fields, documents, trust and lien panel, discrepancy flags, timeline |
| Renewal | Submit a linked replacement, show old and new side by side |
| Release request | Eligibility checklist, hold warning, document checklist, live stage tracker |
| Notifications | Reminders and correction requests |

### Reviewer (Regulation Bureau and office staff)

| Screen | Purpose |
| --- | --- |
| Work queue | Items awaiting my review or my office stage, sorted by due date, overdue highlighted |
| Review page | Instrument details beside the document viewer. Verify, flag, request information, run bank check (simulation) |
| Discrepancy list | Open flags across institutions with resolution actions |
| Release stage review | My stage with approve, reject or return and mandatory remarks |
| Institution profile | Instruments, holds and history |

### Approver

| Screen | Purpose |
| --- | --- |
| Decision queue | Renewals and releases awaiting a decision |
| Case summary | Full journey with time per stage, holds, lien status, trust level |
| Decision | Approve or reject with remarks, download NOC or sanction order |
| Holds | Place and clear holds with remarks |

### Admin

| Screen | Purpose |
| --- | --- |
| Users | Create, deactivate, assign role and office |
| Institutions | Create, edit, bulk CSV import with dry-run preview and row errors |
| Settings | Edit reminder days, categories, required documents, stage order and SLAs, adapter mode. Sample values clearly marked |
| Audit log | Filters by user, action, entity and date |
| System status | Last job run, notifications sent |

### Dashboard (role filtered)

- KPI cards: total, active, expiring, overdue, renewed, released, pending verification, active holds.
- Charts: instruments by status, maturities by month (next 12), trust-level split, release pipeline per stage, average days per stage.
- Needs-attention list: expiring within 7 days, overdue, stuck beyond SLA, missing documents, lien not confirmed.
- Filters: region, category, instrument type, date range. Export CSV. Every number links to its records.

## 7. Signature interactions

1. **Trust badge reveal:** the badge animates to the new level after a verification, with the Simulation hatch for mock results.
2. **Release stage tracker:** a glass card with a perspective stage ribbon. The active office lifts forward, time-at-stage counts up, overdue stages tint amber then red.
3. **Hold block:** when a hold exists, the release button shows a clear locked state with the reason and source body.
4. **Approval moment:** a success check and a document-card flip when the NOC or sanction order is issued.
5. **Validation:** a restrained error shake and inline message when the server returns a 409 or 422.

## 8. Acceptance criteria

- Every screen above works against the real backend with the seeded demo users.
- Each role sees only its own navigation and data. Direct URL access to a forbidden route redirects with a message.
- The seven demo scenarios can be run end to end without touching the database by hand.
- Lighthouse accessibility score is 90 or higher on key pages. Keyboard-only use is possible for every flow.
- With reduced motion enabled, nothing animates beyond simple fades.
- No console errors, no hard-coded durations outside the motion tokens, no emoji icons, no placeholder text.
- Production build passes type-check and lint.

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Backend contract differs from this document | The agent reads the code and OpenAPI first and reports differences |
| Visual effects hurt readability | Glass only on floating layers, contrast checks, solid fallbacks |
| Motion causes discomfort or lag | Tokens, transform and opacity only, reduced-motion support |
| Library components are Pro or need a key | Fall back to a minimal build on the same tokens and tell the user |
| Simulated results mistaken for real | Mandatory Simulation label on every surface that shows them |

# Part B: Prompt for Antigravity

How to use it: open your frontend project (with the backend running locally and seeded), start the agent in Planning mode, paste the prompt, review the plan, and approve one phase at a time. Before starting, set up an Originkit API key at originkit.dev (Settings, API Integration) if you want the agent to fetch component source.

```
ROLE
You are a senior product designer and frontend engineer. Upgrade the existing frontend of the AICTE Security Deposit and FDR Management Portal (SIH 2026 PS 26265) into a professional, regulator-grade interface that is fully integrated with the real backend. Work inside the existing project. Keep the current framework and routing unless there is a strong reason to change; if you want to change anything structural, ask first.

CONTEXT
The backend (Node, Express, TypeScript, Prisma, PostgreSQL) is built and running locally. Roles: INSTITUTION_USER, REVIEWER, APPROVER, ADMIN. Core ideas the UI must express: trust levels (Submitted, Staff Verified, Bank Confirmed, plus a Simulation variant), lien status, instrument types (FDR, RTGS deposit, bank guarantee), a configurable multi-office release workflow, holds that block release, admin-editable settings, NOC and sanction order PDFs, reminders, escalation, dashboard and audit log. Seed users and data are fictional and prefixed [DEMO].

STEP 0: DISCOVERY (read only, no edits)
1. Inspect the frontend: framework, build tool, styling approach, router, state and data fetching, existing screens, and any mock data.
2. Inspect the backend: read src/modules/*/*.routes.ts, the Prisma schema, the error handler, and the OpenAPI/Swagger output if present. Produce the real endpoint contract (method, path, role, request, response, error shapes). Do not invent endpoints. List differences from this expected list: auth (login, logout, me, refresh), institutions, fdrs (list, create, get, patch, documents, submit, verify, bank-verify, lien, renewals, release-requests), release stages and order download, holds, documents (download and signed URL), notifications, dashboard summary and drill-downs, reports (JSON/CSV), settings, import, audit logs.
3. Report what already exists, what is missing, and what is mocked. Then propose a plan and STOP for my approval.

DESIGN RULES (apply in every phase)
- Look and feel: calm, precise, authoritative; closer to a modern banking or audit product than a typical government site. Left navigation rail, slim glass top bar, clear hierarchy, dense readable tables for officers, roomier layouts for institutions.
- Forbidden: default purple-blue gradients, gradient text everywhere, emoji icons, stock illustrations, lorem ipsum, tricolour banners, marquee text, crowded link bars, glass on every surface, tilt on every card, decorative animation inside tables or forms.
- Tokens first: define CSS variables for colour (ink-navy base, cool-grey scale, one restrained accent, semantic colours for trust, status and deadlines), type (one sans for UI, one monospace for references and amounts, tabular numerals), spacing (4/8 scale), radius, elevation, blur and motion (durations, easings). Light and dark themes from the same tokens. Choose a deliberate font pairing with fallbacks.
- Icons: one consistent line-icon set (for example Lucide). No emoji.
- Glassmorphism only on floating layers: top bar, side panels, modals, popovers, toasts, stage-tracker card. Use backdrop-filter blur with translucent tint and a 1px light border over a quiet gradient or grain background. Text on glass must pass WCAG AA. Provide solid fallbacks for no backdrop-filter and for reduced transparency. Tables, forms and long text stay on solid surfaces.
- 3D and motion only where it carries meaning: perspective page or section transition, subtle card tilt with glare on dashboard KPI and summary cards (a few degrees, disabled on touch and on tables), depth when modals and panels open, a stage tracker that advances through space. Animate transform and opacity only. Interactions under 300ms, page transitions under 450ms. Everything must respect prefers-reduced-motion with a simple fade fallback. All durations and easings come from motion tokens, never hard-coded.
- Accessibility: WCAG 2.1 AA, visible focus, full keyboard use, labelled inputs, never colour alone for status or trust.

COMPONENT SOURCES
- transitions.dev: install the skill with: npx skills add Jakubantalik/transitions.dev. Run transitions reveal to list what is actually available, and npx transitions-pro list. Prefer its t-* transitions and motion tokens for: modal, dropdown, tooltip, accordion, sliding tabs and segmented control, page slide, card hover tilt with glare, number pop-in, notification badge, skeleton loader and shimmer, error shake, success check, text and icon swaps, card resize. If a transition is Pro-only and needs a login, tell me and build a minimal equivalent on the same tokens. At the end run transitions refine to replace ad-hoc durations with tokens.
- Originkit (originkit.dev): use its MCP server to browse and fetch components for my stack and styling approach. If it needs an API key and none is configured, ask me to set it up; do not guess. Use Originkit for accents only: one restrained animated background on the login page, text or number animation on the dashboard hero KPIs, and light empty-state visuals. Never inside data tables or forms.
- Report which components you used from each source and anything you built yourself.

INTEGRATION RULES
- Typed API client with base URL from an environment variable. Access token in memory; use the refresh-cookie flow if the backend provides it; on 401 refresh once, then log out.
- Use TanStack Query (or the existing equivalent) for data, loading, error and cache invalidation. Forms with react-hook-form and Zod mirroring backend validation.
- Money arrives as strings (Decimal). Format with Indian digit grouping and a rupee symbol; never use floating-point arithmetic on money.
- Map backend errors (domain errors, Zod, 403, 404, 409) to clear field-level or toast messages. Show the server reason for 409 workflow conflicts.
- Role-based route guards and role-based redirect after login. Do not show actions the server will reject by role or status, but treat the server as the authority.
- Trust level, lien status, lifecycle status and stage status are read-only in the UI except through the dedicated action endpoints. Any simulated bank result must show a visible Simulation label everywhere it appears.
- No mock data in the live path. Remove or isolate existing mocks.
- Authenticated downloads for reports and documents; use the signed-URL endpoint for documents if it exists.

PHASE 1: Design system and shell
Tokens, themes, typography, icons, glass utilities with fallbacks, motion tokens, app shell (rail, glass top bar, theme switch), and the shared components: status badge, trust badge (three levels plus Simulation variant, tooltip), lien badge, countdown chip (amber under 60 days, red under 15), timeline, stage tracker, document viewer with version history, data table (sort, filter, paginate), filter bar, KPI card, confirmation dialog, toast, empty state, skeleton. Add a simple internal component gallery page for review. STOP for approval.

PHASE 2: Auth and API layer
Login (with restrained Originkit background), session handling, refresh, route guards, role redirects, notification bell with unread badge, typed API client, error mapping. Verify with all four seeded roles. STOP.

PHASE 3: Institution screens
Home, my instruments, add and edit instrument (type-aware fields, document upload, lien claim, submit), instrument detail (fields, documents, trust and lien panel, discrepancy flags, timeline), renewal (old and new side by side), release request (eligibility checklist, hold warning, document checklist, live stage tracker), notifications. STOP.

PHASE 4: Reviewer and approver screens
Work queue, review page with document viewer beside details, verify, flag and resolve discrepancies, bank check (simulation), institution profile, release stage review (approve, reject, return with mandatory remarks), decision queue, case summary with time per stage, decision with order download, hold placement and clearing with remarks. STOP.

PHASE 5: Admin and dashboard
Users, institutions with CSV import dry-run preview and row errors, settings editor (sample values clearly marked, validation per key), audit log viewer with filters, system status. Role-filtered dashboard: KPI cards, status chart, maturities by month, trust-level split, release pipeline, average days per stage, needs-attention list, filters, CSV export, every number linking to its records. STOP.

PHASE 6: Motion polish and QA
Apply perspective page transition, tilt and glare on KPI and summary cards, modal and panel depth, stage tracker motion, trust badge reveal, success check on approvals, error shake on validation. Run transitions refine. Verify reduced-motion and reduced-transparency behaviour. Run type-check, lint, production build, a keyboard-only pass, and a Lighthouse accessibility check on key pages. Write end-to-end tests (Playwright or the existing runner) for the demo scenarios: submit and validate an instrument, see days remaining, reminder appears, renewal links old and new, discrepancy raised and resolved, release passes every office and an order is generated, release blocked by a hold then cleared. Update the README with run instructions and demo logins.

OUTPUT AT THE END OF EACH PHASE
- What changed and which files
- Components used from transitions.dev and Originkit, and anything built by hand
- Endpoints integrated and any contract differences found
- Screenshots or a short walkthrough of what to check
- Type-check, lint and test results
- Anything that needs my decision
Then stop and wait.
```

Before the final demo, replace sample settings with handbook values, keep the Simulation labels visible, and record a short screen capture of each scenario as a backup.
