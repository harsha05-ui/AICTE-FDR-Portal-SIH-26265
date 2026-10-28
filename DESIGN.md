# DESIGN.md — AICTE FDR Portal Frontend Redesign

> Drop this file in the repo root. Tell Antigravity: **"Read DESIGN.md fully. Execute Phase 0 and stop. Show me the audit before changing anything."**

---

## 0. Mission

Restyle the **existing** AICTE FDR Portal frontend so it feels like a premium, calm, product-grade fintech app, modelled on the reference site below. This is a **presentation-layer-only** job.

**Reference:** https://sweet-process-405623.framer.app/ (Orbbitly)
**Reference subpages worth opening:** `/platform`, `/developers`, `/security`, `/solutions`, `/ai-agents`

### Hard rules (never break)

1. **Do not touch the backend**, API clients, endpoints, request/response shapes, auth, env files, DB, or business logic.
2. **Do not rename, remove, or re-wire** data hooks, stores, services, route paths, or props that carry data. Restyle around them.
3. **The login must keep using the existing auth flow** (same endpoints, tokens, roles, redirects). Only its look and surroundings change.
4. Every existing feature, button, export, filter and queue must still work after the change. If a visual change would break one, keep the behaviour and flag it.
5. Don't add dependencies unless the audit shows nothing existing can do the job. Prefer what the project already uses.
6. Work in small commits/steps. After each phase the app must build and run.

---

## 1. Phase 0 — Audit (do this first, write findings to `AUDIT.md`, then STOP for review)

Inspect the codebase and report:

- **Stack:** framework, router, styling system (Tailwind / CSS modules / styled-components / UI kit), component library, icon set, chart lib, animation lib, fonts currently loaded.
- **Shell:** where the sidebar, topbar, layout and page wrappers live.
- **Page inventory:** every route/page (Dashboard, Work Queue, FDR Instruments, Institution Profiles, Renewals & Transfer, Release Stage Review, OCR Verification, Reports & Export) and which components each uses.
- **Component inventory:** cards, stat tiles, tables, badges/chips, buttons, inputs, modals, tabs, toasts, empty/loading/error states. Note duplicates and one-off inline styles.
- **Data bindings map:** for each page, which API calls/hooks feed which UI element. This is the "do not break" list.
- **Auth & entry:** current login page/route, how auth state is stored, role handling, post-login redirect, logout, and what an unauthenticated visitor sees today.
- **Vibe-coded smells found** (see section 3) with file paths.
- **Risks:** anything where restyling could break behaviour.

Then propose a short migration plan. **Wait for approval.**

---

## 2. Phase 1 — Extract the reference design tokens

Use the browser tool to open the reference site and **measure, don't guess**. Capture at desktop (1440) and mobile (390):

- Colour palette (background, surface, border, text primary/secondary/muted, accent, success, warning, danger, info) — with exact hex values
- Font families, weights, sizes, line-heights, letter-spacing for display / heading / body / label / numeric
- Spacing scale, section padding, max content width, grid gaps
- Border radii, border widths, shadow stack, any gradients or glows
- Button, chip, input, card, table, and nav styles (default / hover / active / focus)
- Every animation: what triggers it, duration, delay, easing, distance, and stagger
- Screenshot each major section for side-by-side comparison

Write results to `design-tokens.md` and map them into the project's theme (CSS variables or Tailwind config). **Use the reference's real values, not the placeholders below.**

### Placeholder direction (override with extracted values)

| Token | Direction |
|---|---|
| Mood | Calm, precise, trustworthy. Light surfaces, generous whitespace, restrained colour |
| Background | Near-white, slightly warm or cool neutral |
| Surfaces | White cards, 1px hairline borders, very soft shadows |
| Text | Near-black primary, two tiers of grey for secondary/muted |
| Accent | **One** primary accent only. Status colours used sparingly and only for meaning |
| Radius | One consistent radius for cards, a smaller one for controls |
| Type | One sans family for UI. A tabular-figures variant for numbers. **No monospace headings** |
| Density | Comfortable. Nothing touching a container edge |

---

## 3. What to remove (the "vibe-coded" look)

Seen in the current dashboard; find every instance in the codebase:

- ALL-CAPS **monospace** labels on cards, panel titles and section headers (e.g. "ACTIVE DEPOSITS", "STATUTORY OPERATIONS & SLA METRICS PANEL")
- Translucent **tinted cards with coloured borders** (green, amber, red, blue, grey) — replace with neutral cards and a small status dot or chip
- Text sitting flush against card edges with no padding; clipped or overlapping content
- Low-contrast pale numerals on tinted fills
- The **cropped AICTE logo** in the sidebar header
- Heavy dark-navy hero banner with a coded tag line and a bright green CTA; replace with a quiet page header
- "Problem Statement PS-xxxxx" and "[DEMO]" strings in user-facing chrome (hide at the presentation layer only; don't alter data)
- Arrow-in-corner icons on every card, rainbow icon badges, mixed icon styles
- Long, shouty, "regulatory-sounding" copy; shorten labels to plain, sentence-case wording
- Inconsistent radii, shadows, font sizes, and button styles from one-off inline styles
- Any emoji, gradient text, glassmorphism, neon glows, or decorative effects not present in the reference

---

## 4. Layout & navigation — tabs, not scrolling

**The app must not feel like a long scrolling page.** Use a fixed app shell where each view fits the viewport.

- **Shell:** fixed left sidebar (collapsible) + slim topbar (breadcrumb, ⌘K search, theme toggle, notifications, user). Shell never scrolls.
- **Main area height:** `100dvh` minus topbar. Page-level scroll is disabled. Only a table body or list **inside** a panel may scroll internally, with a sticky header.
- **Each page** gets a page header (title, one-line description, primary action) and a **tab bar** with an animated underline/pill indicator. One tab = one focused job.
- Keep existing sidebar routes. Add tabs *inside* pages rather than stacking sections.

### Dashboard tab split (adapt to what exists)

| Tab | Contents |
|---|---|
| **Overview** | Six lifecycle KPI tiles (Active deposits, Expiring in 30 days, Overdue matured, Pending verification, Renewals pending, Release requests) + a compact attention strip |
| **Priority queue** | The Statutory Priority Action Queue table, filters, "View all FDRs" |
| **SLA metrics** | Avg verification time, cases beyond SLA, reminders dispatched, missing documents, as a tidy metric grid with small trend visuals |
| **Discrepancies** | Active discrepancies list/table with drill-down |
| **Exports** | Active FDRs, Expiring/Matured, Discrepancies exports; keep watermark note as small helper text |

Apply the same logic to other pages: split long pages into 2–4 tabs; use side drawers or modals for detail instead of pushing content down.

Responsive: below 1024px the sidebar becomes an overlay drawer; tabs become horizontally scrollable; KPI grid collapses to 2 then 1 column.

---

## 4A. First-visit entry: animated showcase + login

Unauthenticated visitors land on a **single-screen split layout** (no scrolling, no marketing page). It recreates the reference site's animated product hero, then hands over to the real portal.

**Layout (desktop)**
- **Left, about 60%:** the animated showcase panel.
- **Right, about 40%:** the login card, vertically centred, always visible.
- **Mobile / narrow:** login comes first; the showcase shrinks to a compact animated band above it or is hidden.

**Showcase panel**
- A framed "app window" mock (mini sidebar, topbar, run chip) like the reference's hero, built from real components with static sample data. Never show real institution or user data before login.
- Short headline and one-line subtext above or beside the window. Plain, human wording, for example "Every FDR, verified and traceable."
- The window plays a looping story in four scenes, mirroring the reference's Connect → Understand → Verify → Act flow, mapped to this portal:

| Scene | What animates |
|---|---|
| **1. Receive** | Submissions arrive from institutions, bank confirmations and scanned certificates; source rows flip from "syncing" to "synced" |
| **2. Extract** | An FDR certificate appears; the OCR pass runs ("Extracting…") and a structured record fills in field by field (institution, bank, FDR number, amount, maturity date) with source page references |
| **3. Verify** | Checks tick off one by one (bank match, maturity date, document completeness); one exception gets flagged with a "why this was flagged" note and a confidence figure |
| **4. Decide** | Reviewer approves or flags; audit-trail entries appear with timestamps; a completion card shows verified counts and an SLA tick |

- A small step indicator (four dots or labels) shows progress and is clickable. Scenes advance automatically (about 5–6 seconds each), pause on hover or focus, and loop.
- Smooth hand-offs: elements morph or slide between scenes, no hard cuts.
- The **first time** a visitor arrives (flag in `localStorage`), the full intro plays once: the window builds in, then scene 1 begins. On return visits, skip the build-in and start playing straight away.
- `prefers-reduced-motion`: show a static, finished scene with manual step controls.

**Login card (right)**
- Clean card with the AICTE logo (uncropped), "FDR Portal · Govt. of India", and the existing fields only. Don't add or remove fields, roles or options.
- Inline validation, show/hide password, visible focus, proper tab order, Enter to submit.
- Loading state on the button, inline error state, locked state for failures if the backend returns it.
- Pressing submit calls the **existing** auth logic unchanged.

**After login**
- The split layout transitions out (showcase fades and slides left, login card dissolves) and the real app shell animates in: sidebar, topbar, then the dashboard tiles staggering in.
- Logging out returns to this entry screen.
- Already-authenticated visitors skip it and go straight to the dashboard.

---

## 5. Component spec

- **KPI tile:** neutral white card, small sentence-case label, large tabular number, one-line helper text, tiny status dot (not a coloured card). Entire tile is the click target with a subtle hover lift. No corner arrow.
- **Status chip:** small, rounded, soft tint + dot; text always sentence case. Fixed set: Active, Expiring, Overdue, Pending, Matched, Flagged, Missing.
- **Tables:** sticky header, row hover, tabular numerals, right-aligned amounts, quiet row dividers, inline row actions on hover, skeleton rows while loading, designed empty state.
- **Buttons:** primary (accent, solid), secondary (outlined), ghost. One primary per view. Visible focus ring.
- **Inputs and search:** same radius and height everywhere; ⌘K opens a command palette over existing routes and records.
- **Exports bar:** becomes a single "Export" menu button with the three options, not a banner.
- **Page header:** title + subtitle + actions. No dark hero.
- **Detail views:** show a source-linked "why this was flagged" explanation and an audit timeline, as the reference does for exceptions. Reuse existing data; only restyle.
- **Loading / empty / error:** every data region gets all three states, designed.

---

## 6. Motion spec

Premium comes from restraint. Match the reference's motion language (confirm in Phase 1), defaulting to:

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`. Durations 150–200ms for hover/press, 300–450ms for entrances.
- **Tab change:** content cross-fades with a 6–8px upward settle; indicator slides between tabs.
- **Tab entrance:** KPI cards and table rows **stagger in** (40–60ms apart). Numbers **count up** once, with tabular figures so nothing jitters.
- **Status changes:** chips morph colour/label smoothly (e.g. Pending → Verified); a brief pulse on newly updated rows.
- **Progress/SLA visuals:** bars and rings animate from 0 on first view.
- **Reference-style sequences:** where a record is being processed (OCR verification, scrutiny steps), show the "Extracting… → fields fill in → checks tick off" sequence the reference uses in its hero, driven by real state rather than fake timers.
- **Entry showcase:** scene transitions, field-by-field record fill, check ticks and audit entries use the same easing; the full spec is in section 4A.
- **Hover:** cards lift 1–2px with a soft shadow shift; buttons press down slightly.
- **Route change:** quick fade/slide of the main pane; the shell stays still.
- **Accessibility:** honour `prefers-reduced-motion` (fade only, no movement or count-up). Animate only `transform` and `opacity`. No animation blocks interaction or delays data.
- **No** parallax, scroll-jacking, bouncing, auto-playing loops, or decorative particles.

Use the animation library already in the project; if none, use CSS transitions first and add `motion` (framer-motion) only if needed.

---

## 7. Phased execution

| Phase | Output | Gate |
|---|---|---|
| 0 | `AUDIT.md` | Wait for approval |
| 1 | `design-tokens.md` from the live reference | Confirm tokens |
| 2 | Theme layer: CSS variables / Tailwind config, fonts, base styles, remove old theme hacks | Builds, app still works |
| 3 | Shell: sidebar, topbar, logo fix, page header, tab component, ⌘K | Navigation intact |
| 3A | Entry screen: animated showcase + login split layout, post-login transition (section 4A) | Login/logout still works exactly as before |
| 4 | Shared components: tile, chip, table, buttons, inputs, states | No data regressions |
| 5 | Pages one at a time, starting with Dashboard, into tabs | Verify each page vs. data map |
| 6 | Motion pass | Reduced-motion tested |
| 7 | QA | See below |

Finish one page completely before starting the next.

---

## 8. Definition of done

- App builds with no new type or lint errors; no backend or API files changed (`git diff` confirms)
- Every call in the Phase 0 data map still fires and renders
- No page-level scroll at 1440×900, 1280×720, and 1024×768; mobile layout works at 390
- Side-by-side screenshots against the reference show matching typography, spacing, radii, colour, and motion feel
- Text contrast meets WCAG AA; full keyboard navigation and visible focus
- Unauthenticated visitors see the animated showcase with the login on the right; successful login lands on the dashboard through the transition; failed login shows a clear inline error
- Auth endpoints, tokens, roles and redirects are unchanged
- No leftover monospace headings, tinted bordered cards, clipped logo, or unused old styles
- Short `CHANGELOG-UI.md` listing what changed and anything intentionally left alone
