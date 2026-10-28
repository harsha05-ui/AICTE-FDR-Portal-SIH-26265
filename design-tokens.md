# Design Tokens & Motion Specification — AICTE FDR Portal

**Source:** Measured from live reference https://sweet-process-405623.framer.app/ (Orbbitly)  
**Spec Reference:** `DESIGN.md` (Phase 1 Output)  
**Target:** Clean, calm, product-grade fintech aesthetic with high visual precision and zero "vibe-coded" noise.

---

## 1. Color Palette

All tokens are defined as clean CSS variables and mapped into Tailwind CSS colors.

### 1.1 Core Neutrals & Surfaces

| Token Name | Hex Value | HSL Value | Usage |
|---|---|---|---|
| `--color-canvas` | `#f8fafc` | `hsl(210, 40%, 98%)` | Page canvas background |
| `--color-canvas-subtle`| `#f1f5f9` | `hsl(215, 32%, 96%)` | Secondary background, panel fills, table headers |
| `--color-surface` | `#ffffff` | `hsl(0, 0%, 100%)` | Card surface, modal surface, tab panels |
| `--color-surface-raised`| `#ffffff` | `hsl(0, 0%, 100%)` | Hovered cards, floating dropdowns, command palette |
| `--color-border` | `#e2e8f0` | `hsl(214, 32%, 91%)` | Standard 1px hairline border across cards and tables |
| `--color-border-subtle`| `#f1f5f9` | `hsl(215, 32%, 96%)` | Inner cell dividers, soft section borders |
| `--color-border-strong`| `#cbd5e1` | `hsl(215, 25%, 82%)` | Input borders on hover, active dividers |

### 1.2 Typography Colors

| Token Name | Hex Value | HSL Value | Contrast Ratio on White | Usage |
|---|---|---|---|---|
| `--color-text-primary` | `#0f172a` | `hsl(222, 47%, 11%)` | `16.1:1` (AAA) | Headings, card titles, primary numbers |
| `--color-text-secondary`| `#475569` | `hsl(215, 25%, 35%)` | `7.3:1` (AAA) | Subheadings, body copy, table cell content |
| `--color-text-muted` | `#94a3b8` | `hsl(215, 20%, 65%)` | `4.6:1` (AA) | Helper text, breadcrumbs, table column headers |
| `--color-text-inverted` | `#ffffff` | `hsl(0, 0%, 100%)` | `16.1:1` | Text on dark buttons and dark badges |

### 1.3 Brand & Primary Accent

| Token Name | Hex Value | HSL Value | Usage |
|---|---|---|---|
| `--color-accent` | `#0f172a` | `hsl(222, 47%, 11%)` | High-contrast primary action button, active nav indicator |
| `--color-accent-hover` | `#1e293b` | `hsl(215, 28%, 17%)` | Hover state for primary action buttons |
| `--color-accent-soft` | `#f1f5f9` | `hsl(215, 32%, 96%)` | Subtle button background, active tab pill |
| `--color-brand-blue` | `#2563eb` | `hsl(217, 91%, 60%)` | Key interactive links, active focus rings, selection |
| `--color-brand-lime` | `#ccff00` | `hsl(72, 100%, 50%)` | Micro-accent status badge dot / feature highlight |

### 1.4 Status & Compliance Semantic Tokens

Each status state uses a **restrained pastel fill**, a **solid 6px dot**, and **high-contrast dark text** (no bright neon cards or tinted fills).

| Status | Dot Hex | Surface Fill Hex | Text Hex | Hairline Border Hex | Applied For |
|---|---|---|---|---|---|
| **Active / Success** | `#10b981` | `#ecfdf5` | `#065f46` | `#d1fae5` | Active deposits, verified status, compliant rules, approved stages |
| **Warning / Attention**| `#f59e0b` | `#fffbeb` | `#92400e` | `#fef3c7` | Expiring in 30 days, renewal pending, under review |
| **Danger / Flagged** | `#ef4444` | `#fef2f2` | `#991b1b` | `#fee2e2` | Overdue matured, active regulatory hold, discrepancy flagged, rejected |
| **Info / Progress** | `#3b82f6` | `#eff6ff` | `#1e40af` | `#dbeafe` | Regional scrutiny queue, syncing data, multi-office in transit |
| **Neutral / Submitted**| `#64748b` | `#f1f5f9` | `#334155` | `#e2e8f0` | Newly submitted draft, standard notice, inactive |

---

## 2. Typography Scale

- **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Tabular Figures Feature:** `font-feature-settings: 'tnum' 1, 'cv05' 1, 'zero' 1;` (applied to all numbers, amounts, dates, and metric cards)
- **Code / Monospace:** `'JetBrains Mono', 'IBM Plex Mono', monospace` (Strictly restricted to IFSC codes, transaction hashes, and certificate IDs. **No monospace on card headers or section titles.**)

| Level | Size | Weight | Line Height | Letter Spacing | CSS Utility / Class |
|---|---|---|---|---|---|
| **Display / Hero Title** | `48px` (`3rem`) | 600 (Semibold) | `1.1` (`52px`) | `-0.03em` | `text-4xl sm:text-5xl font-semibold tracking-tight` |
| **Page Heading (H1)** | `24px` (`1.5rem`) | 600 (Semibold) | `1.25` (`30px`) | `-0.02em` | `text-2xl font-semibold tracking-tight text-slate-900` |
| **Section Heading (H2)**| `18px` (`1.125rem`)| 600 (Semibold) | `1.3` (`24px`) | `-0.015em` | `text-lg font-semibold tracking-tight text-slate-900` |
| **Card / Panel Title** | `14px` (`0.875rem`)| 600 (Semibold) | `1.4` (`20px`) | `-0.01em` | `text-sm font-semibold text-slate-900` |
| **Metric Large Number** | `30px` (`1.875rem`)| 600 (Semibold) | `1.15` (`34px`) | `-0.025em` | `text-3xl font-semibold tabular-nums text-slate-900` |
| **Body (Default)** | `13px` (`0.8125rem`)| 400 (Regular) | `1.5` (`20px`) | `0` | `text-[13px] text-slate-600 leading-relaxed` |
| **Body (Medium / Data)**| `13px` (`0.8125rem`)| 500 (Medium) | `1.5` (`20px`) | `0` | `text-[13px] font-medium text-slate-800` |
| **Caption / Meta** | `11px` (`0.6875rem`)| 500 (Medium) | `1.4` (`16px`) | `0.01em` | `text-[11px] font-medium text-slate-500` |
| **Table Column Header** | `11px` (`0.6875rem`)| 600 (Semibold) | `1.4` (`16px`) | `0.02em` | `text-[11px] font-semibold text-slate-500 uppercase tracking-wider` |

---

## 3. Radii, Borders & Shadows

### 3.1 Border Radii Scale

```css
--radius-control: 8px;     /* Buttons, input fields, select dropdowns */
--radius-chip: 9999px;     /* Status chips, count pills, badge tags */
--radius-card: 14px;      /* Content cards, KPI tiles, panel wrappers */
--radius-window: 18px;    /* Hero showcase framed mockup window, main modals */
```

### 3.2 Hairlines & Focus

- Hairline standard: `1px solid var(--color-border)` (`#e2e8f0`)
- Focus ring: `2px solid #0f172a` with `2px` offset (`focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`)

### 3.3 Shadow Stack

```css
/* Level 1: Flat resting card */
--shadow-card: 0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04);

/* Level 2: Interactive card hover & dropdown menus */
--shadow-hover: 0 6px 16px -4px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04);

/* Level 3: Modal dialogs, floating hero mockup window */
--shadow-modal: 0 24px 48px -12px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06);
```

---

## 4. Component Styles

### 4.1 KPI Tile
- Surface: `#ffffff`, 1px border `#e2e8f0`, `border-radius: 14px`, `box-shadow: var(--shadow-card)`.
- Padding: `16px 20px`.
- Hover: `transform: translateY(-1px)`, `box-shadow: var(--shadow-hover)` with `180ms cubic-bezier(0.22, 1, 0.36, 1)`.
- Header: small sentence-case label (`text-xs font-medium text-slate-500`) + 6px semantic status dot.
- Number: `30px font-semibold text-slate-900 tabular-nums`.
- Subtext: `text-[12px] text-slate-500`.
- **Zero corner arrows, zero tinted card fills, zero 3D glare.**

### 4.2 Status Chip
- Structure: `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ...">`
- Inner indicator: `<span class="w-1.5 h-1.5 rounded-full bg-... shrink-0" />`
- Always sentence-case label.

### 4.3 Buttons
- **Primary:** `bg-slate-900 text-white font-medium hover:bg-slate-800 active:scale-[0.99] rounded-lg px-3.5 py-2 text-xs shadow-sm`
- **Secondary / Outline:** `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-3.5 py-2 text-xs`
- **Ghost:** `bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg px-3 py-1.5 text-xs`

### 4.4 Tables
- Sticky Header: `position: sticky; top: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; z-index: 10`.
- Row Hover: `bg-slate-50/70` with `transition: background-color 120ms ease`.
- Dividers: `1px solid #f1f5f9`.
- Figures: Right-aligned monetary numbers (`text-right tabular-nums font-medium`).
- Height: Container max-height fits page with `overflow-y: auto`.

### 4.5 Tabs & Indicator
- Bar: `border-b border-slate-200 flex gap-6 px-1`.
- Tab Button: `relative pb-3 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors`.
- Active Tab: `text-slate-900 font-semibold`.
- Active Underline Pill: `position: absolute; bottom: -1px; height: 2px; width: 100%; background: #0f172a; border-radius: 9999px; transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1)`.

---

## 5. Animation & Motion Spec

### 5.1 Physics & Easing

```css
--ease-spring: cubic-bezier(0.22, 1, 0.36, 1);  /* Orbbitly spring ease-out */
--ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
```

| Interaction | Duration | Easing | Distance / Effect |
|---|---|---|---|
| **Hover / Press** | `150ms` | `var(--ease-spring)` | `translateY(-1px)` / `scale(0.99)` |
| **Tab Settle** | `280ms` | `var(--ease-spring)` | `opacity: 0 -> 1`, `translateY(6px -> 0px)` |
| **Card Stagger Entrance** | `320ms` | `var(--ease-spring)` | Delay: `index * 45ms`, `opacity: 0 -> 1`, `translateY(10px -> 0)` |
| **Tabular Count-Up** | `400ms` | Ease-out cubic | 0 to target number on initial view |
| **Status Chip Morph** | `200ms` | `var(--ease-spring)` | Color & opacity cross-fade |
| **Hero Showcase Scene Cycle** | `5200ms` | Custom sequence | Automatic 4-scene progression (Receive → Extract → Verify → Decide) |

### 5.2 Accessibility / Reduced Motion Fallback

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Under reduced motion:
- No `translateY` sliding or transforms.
- Instant or subtle 100ms cross-fades only.
- Number count-up renders target number immediately with no increment animation.
- Hero Showcase displays a static, complete scene with manual step indicators.

---

## 6. Entry Screen Hero Showcase Storyboard

| Scene | Name | Duration | Animated Actions | Visual Components |
|---|---|---|---|---|
| **1** | **Receive** | `5.2s` | Institutions, scheduled bank confirmations, and deposit scans stream into the inbox. Row tags smoothly flip from `syncing...` to `synced`. | Source stream table, live pulse dot, institution badges (e.g. VJTI, IIITM). |
| **2** | **Extract** | `5.2s` | FDR Certificate document appears in preview; an OCR scan bar glides top-to-bottom ("Extracting fields..."); structured fields fill in one by one (FDR No., Bank, Branch, Amount: ₹1,00,00,000, Maturity: 2031-11-20). | Split card with scan ray, confidence chip (99.2%), structured field tiles. |
| **3** | **Verify** | `5.2s` | Automated compliance rules execute sequentially with checkmarks: Joint account with AICTE verified, lock-in period conforms to norms, bank IFSC validated. One flag highlighted with quiet "why this was flagged" reason. | Pre-check rules checklist, green checkmark cascade, subtle amber warning note. |
| **4** | **Decide** | `5.2s` | Official reviewer scrutiny stamp applied; audit trail entry logged with digital timestamp; verified status chip appears; completion indicator shows "SLA: 2.1 hrs (Within Target)". | Verification stamp card, audit trail row, SLA metric pill. |

A 4-step progress indicator at the bottom allows evaluation committee or visitors to click and jump directly to any scene or pause the loop on hover.
