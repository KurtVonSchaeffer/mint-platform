---
name: AlgoLend Admin Console
description: Internal operations control plane for MINT Platforms — obsidian-dark, electric-violet, information-dense
colors:
  obsidian-void: "#06070D"
  obsidian-ink: "#0B0D18"
  obsidian-surface: "#101525"
  obsidian-surface-2: "#161C30"
  obsidian-surface-3: "#1D243D"
  electric-violet: "#7C3AED"
  electric-violet-bright: "#9B5CF6"
  violet-soft: "#A78BFA"
  violet-pale: "#C4B5FD"
  text-primary: "#EEF0FF"
  text-secondary: "#8B90B4"
  text-tertiary: "#6E74A4"
  status-green: "#34D399"
  status-red: "#F87171"
  status-amber: "#FBBF24"
  status-sky: "#60A5FA"
  slate-muted: "#9B9FB8"
  slate-muted-2: "#A0A4C0"
  warm-orange: "#FB923C"
  cyan: "#06B6D4"
  indigo-violet: "#8B5CF6"
  rose: "#FB7185"
  cool-gray: "#9CA3AF"
  pink: "#F472B6"
  cobalt-violet: "#5C3BCF"
  bright-sky: "#38BDF8"
  periwinkle: "#818CF8"
  neutral-gray: "#6B7280"
  mint-dark: "#10B981"
  stale-orange: "#F97316"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Georgia, serif"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "14px"
    lineHeight: 1.5
  caption:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 500
    fontSize: "13px"
    lineHeight: 1.4
  micro:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 500
    fontSize: "11px"
    lineHeight: 1.3
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10px"
    letterSpacing: "0.18em"
rounded:
  2xs: "6px"
  xs: "8px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.electric-violet}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.obsidian-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.obsidian-surface-2}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge:
    textColor: "{colors.status-green}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
---

# Design System: AlgoLend Admin Console

## Overview

**Creative North Star: "Obsidian Command"** — already named in the codebase's own `globals.css` header, not invented here: *"deep navy cosmos, electric purple authority."*

This is an internal operations tool, not a marketing surface — per PRODUCT.md, staff (telemarketers, admins, finance, support, managers) live in it all day running the sales pipeline, client lifecycle, and support triage for AlgoLend's B2B lending platform. The visual language reflects that: a near-black, layered navy void that recedes rather than competes for attention, with a single electric-violet accent doing all the emphasis work — CTAs, active nav state, focus rings, hover glows. Everything else (text, borders, surfaces) stays deliberately quiet so the violet reads as authority rather than decoration. A subtle noise texture sits over the whole app, keeping the flat void from feeling sterile without adding visual noise to the actual data.

The system is unapologetically dense: tables, KPI tiles, and status badges dominate over illustration or whitespace-heavy layouts, because the job here is scanning numbers and pipeline state quickly, not being persuaded.

**Key Characteristics:**
- Obsidian-void surfaces (near-black, layered #06070D → #1D243D) that recede
- One accent color (electric violet) carries all emphasis; nothing else competes with it
- Flat at rest, glow and lift only on interaction — depth is earned, not default
- Full light/dark theming via CSS custom property overrides, not a separate light design
- Mono type (JetBrains Mono) marks anything numeric, tabular, or metadata — visually separating "data" from "prose"

## Colors

The palette is almost monochrome by design: one hue family (violet) for emphasis, a near-black neutral scale for structure, and a small fixed status vocabulary (green/red/amber/sky) for state — nothing else.

### Primary
- **Electric Violet Authority** (`#7C3AED`, with a brighter `#9B5CF6` for gradients): the only color allowed to mean "act on this" — primary buttons, active sidebar item, focus rings, links. Used sparingly; its rarity is what makes it read as authority rather than habit.
- **Violet Soft** (`#A78BFA`) / **Violet Pale** (`#C4B5FD`): lighter steps used for icon accents, sidebar highlights, and text that needs a violet tint without full-saturation emphasis (e.g. `eyebrow` breadcrumb segments).

### Neutral
- **Obsidian Void** (`#06070D`): the outermost background layer.
- **Obsidian Ink** (`#0B0D18`): page body background — what `<body>` actually sits on.
- **Obsidian Surface** (`#101525`) / **Surface 2** (`#161C30`) / **Surface 3** (`#1D243D`): three ascending layers used for cards, panels, and nested containers — the deeper the surface number, the more "elevated" the content sitting on it, communicated by lightness, not shadow.
- **Text Primary** (`#EEF0FF`), **Text Secondary** (`#8B90B4`), **Text Tertiary** (`#6E74A4`): three-step text hierarchy. Tertiary is the floor for legibility — both dark- and light-mode values were deliberately raised (see code comments) to clear WCAG AA contrast, so don't darken/lighten it further without re-checking contrast.
- Borders default to near-invisible whites-on-dark (`rgba(255,255,255,0.06–0.10)`), with a violet-tinted border (`rgba(124,58,237,0.12)`) reserved for elements that should read as slightly more important than a plain divider.

### Status
- **Green** (`#34D399`): active, won, success.
- **Red** (`#F87171`): suspended, error, destructive.
- **Amber** (`#FBBF24`): trial, pending, enterprise-tier badge.
- **Sky** (`#60A5FA`): informational, trial-status badge.
- **Slate Muted** (`#9B9FB8` / `#A0A4C0`, base `rgb(75,80,128)`): the deliberately de-emphasized tier — churned clients and the entry-level "core" pricing tier both use this same muted slate-violet, distinct from every energetic status color, so a churned/base-tier badge reads as quieter, not just differently colored.

Status colors always appear as a ~10% tint background with a ~20% tint border and the full-saturation color as text/icon (see `.badge-*` classes) — never as a solid fill. That keeps the status vocabulary readable without competing with the violet accent for visual weight.

### Lead / Call-Outcome Colors

A second, wider status vocabulary exists specifically for lead and call-outcome states (`STATUS_CONFIG` in `leads/page.tsx` and its siblings) — it reuses the core status colors where they already fit (new→amber, contacted→sky, qualified→violet, won→green, lost→red) and adds five colors that don't belong to any other role:

- **Warm Orange** (`#FB923C`): "Attempted" contact, and the "stale lead" warning treatment — distinct from Status Amber so a stale/attempted lead never reads as the same urgency as a trial-tier client badge.
- **Cyan** (`#06B6D4`): "Call Again" — a follow-up state that is neither positive nor negative.
- **Indigo Violet** (`#8B5CF6`): "Call Back" — deliberately a colder, more saturated violet than the brand's Electric Violet, so a scheduled callback never gets mistaken for a primary call-to-action.
- **Rose** (`#FB7185`): "Not Interested" — a softer, less alarming negative than Status Red, since this is a lead outcome, not a system error.
- **Cool Gray** (`#9CA3AF`): "Other" / uncategorized — deliberately desaturated, the same "quietest option" role Slate Muted plays for client tiers.

### Pipeline Stage Colors

A third status vocabulary exists for the 12-stage TM pipeline (`STAGES` in `telemarketer/pipeline/page.tsx`) — mostly the same colors as Lead/Call-Outcome and Status reused by stage (New Lead→Violet Soft, Attempted Contact→Status Sky, Interested→Status Amber, Demo Scheduled→Warm Orange, Demo Completed→Pink, Negotiation→Status Green, Won→Status Green (dark step), Lost→Status Red, Not Interested→Rose), plus three colors unique to this vocabulary:

- **Bright Sky** (`#38BDF8`): "Contacted" — a lighter, more saturated blue than Status Sky, marking the step immediately after first contact as distinct from the "attempted" state before it.
- **Periwinkle** (`#818CF8`): "Proposal Sent" — a colder blue-violet than Indigo Violet, keeping this later-funnel stage visually distinct from the earlier "Call Back" state that already uses Indigo Violet.
- **Neutral Gray** (`#6B7280`): "Other" — a slightly darker, more neutral gray than Cool Gray, used here instead of Cool Gray only because this vocabulary was built independently; both play the same "uncategorized" role.

### Legacy / Escalation Colors

- **Mint Dark** (`#10B981`): a darker step of Status Green, used for "Demo Completed"/"Quoted"-type stage states — a `--color-mint-dark` CSS variable already exists for this in `globals.css` (kept as a legacy compat alias) but was missing from this document.
- **Stale Orange** (`#F97316`): used only as the border tint on the "stale lead" escalation badge's middle tier (7+ days, between the amber "just aging" tier and the red "critical" tier) — one step more saturated than Warm Orange, which remains the tier's text/icon color. The two oranges are deliberately close but not identical; don't consolidate them into one value without checking both tiers still read as distinct steps.

### Agent Identity Colors

Telemarketers are each assigned a color (`AGENT_COLORS`) purely to make their activity visually scannable in shared views (who called whom) — not a status or brand signal. The set is Violet Soft, Status Green, Status Sky, Warm Orange, **Pink** (`#F472B6`), and Status Amber, cycling in that order. Do not reuse this array's ordering or colors to mean anything other than "which agent."

### Sub-Brand Accent (BizTech)

The BizTech module (`/biztech/*`, `BizTechShell.tsx`) is a distinct internal tool sharing every other token in this system, but swaps the primary accent from Electric Violet (`#7C3AED`) to **Cobalt Violet** (`#5C3BCF`) as its own identity — a deliberate sub-brand distinction, not drift. Everything else (surfaces, text, status colors) is shared with the main console.

### Email & PDF Template Colors

Transactional emails (`lib/email.ts`) and generated PDF/print documents use their own light-mode-only, literal-hex palette (grays like `#555`/`#888`/`#aaa` for text, `#f5f6fa` page background, pastel-tinted alert boxes) instead of referencing the tokens above. This is intentional, not undocumented drift: HTML email clients render in light mode regardless of the recipient's system theme, most cannot read CSS custom properties at all, and Outlook in particular has no reliable dark-mode story. Don't try to make an email look like the dark Obsidian Command shell — match its own established light, letter-like convention instead.

### Named Rules
**The One Accent Rule.** Violet is the only hue used for emphasis. Status colors communicate state, never "act here." A second accent hue anywhere in the product would break the "authority through rarity" premise the whole system depends on.

## Typography

**Display/Headline Font:** Plus Jakarta Sans (with Georgia serif fallback) — used at tight, near-1.0 line-height and negative letter-spacing (`-0.03em` to `-0.04em`) for page titles and hero numbers.
**Body Font:** Plus Jakarta Sans, ui-sans-serif, system-ui fallback — everything else.
**Mono Font:** JetBrains Mono — reserved for anything tabular, numeric, or metadata: eyebrow labels, timestamps, currency figures, IDs.

**Character:** One typeface family for prose, deliberately switched to mono whenever the content is data rather than language — the font change itself is the signal that "this is a number/code/ID, read it differently than the sentence next to it."

### Hierarchy
- **Display/Headline** (700, 24–48px depending on prominence, line-height 0.96, letter-spacing -0.03em): page titles (`<h1>`), hero KPI numbers, ARR/revenue hero figures at the largest end.
- **Body** (400–600, 14px typical): table cells, descriptions, form labels — the default text size for anything meant to be read at normal pace.
- **Caption** (500, 13px): secondary/supporting text sitting next to body content — sub-labels, helper text, timestamps in prose form.
- **Micro** (500, 11px): the densest tier — compact table meta, inline counts, small pill/chip text that isn't a full Eyebrow/Label.
- **Eyebrow / Label** (mono, 10px, letter-spacing 0.18em, uppercase, text-tertiary color): section kickers, breadcrumb segments, category tags — always mono, always uppercase, always the quietest text color.

This codebase's real type scale is wider than a clean 5-step hierarchy — sizes from 8px up to 48px appear throughout (9–13px for the densest UI chrome, 14–20px for body/title text, 24–48px for hero/display numbers), reflecting organic growth across many pages rather than a strictly enforced scale. Preserve this as incumbent behavior; consolidating it into fewer steps is a deliberate design decision for a future pass, not something to silently redesign here.

### Named Rules
**The Mono-For-Data Rule.** Any numeric, tabular, or identifier value (currency, counts, IDs, timestamps) renders in JetBrains Mono. Prose never does. This is the system's primary way of visually separating "read this" from "scan this."

## Layout

Density over whitespace: KPI tiles, data tables, and status-badge-heavy rows are the default building blocks, not generous single-column reading layouts. Pages use `page-enter` staggered entrance (each direct child fades/slides up with an increasing delay, capped around 300ms) rather than a single fade, giving a sense of the page assembling itself.

The persistent left sidebar (`sidebar-panel`, 256px, gradient obsidian-void → obsidian-ink) plus a fixed topbar frame every page — this is an "operate" surface (per PRODUCT.md's mode), so navigation and orientation stay constant while content changes underneath.

## Elevation & Depth

**Flat-until-hover.** Cards, buttons, and interactive rows sit flat at rest — no ambient drop shadow by default. Depth is a *response* to interaction, not a static decoration: hovering a `.bento-card` lifts it 3px and reveals a soft violet-tinted glow (`0 0 24px -4px rgba(124,58,237,0.12)`) plus a heavier ambient shadow; hovering a table row tints its background rather than lifting it. Depth is earned by the thing the user is currently touching, never sitting on everything all the time.

### Shadow Vocabulary
- **Card hover — dark** (`0 0 0 1px rgba(124,58,237,0.12), 0 16px 40px -8px rgba(0,0,0,0.6), 0 0 24px -4px rgba(124,58,237,0.12)`): the standard `.bento-card:hover` treatment — a violet ring, a deep ambient shadow, and a soft violet glow layered together.
- **Card hover — light** (`0 0 0 1px rgba(124,58,237,0.14), 0 8px 24px rgba(0,0,0,0.08), 0 0 20px -4px rgba(124,58,237,0.08)`): the same idea, lighter weight for light mode.
- **Button glow** (`0 4px 20px rgba(124,58,237,0.4)`, intensifying to `0 8px 30px rgba(124,58,237,0.5)` on hover): the primary button's resting and hover shadow — violet, never neutral black, reinforcing that this is *the* accent element.
- **Slide-over panel** (`-20px 0 60px rgba(0,0,0,0.22), -1px 0 0 rgba(124,58,237,0.08)`): heavier directional shadow for panels that slide in over content.

### Named Rules
**The Earned-Depth Rule.** Nothing gets a shadow just for existing. A shadow always means "this is currently being interacted with, or is deliberately floating above the base layer" (a slide-over panel, a modal).

## Shapes

Radius scales with the size and importance of the container: small controls get the smallest radius, cards get the largest, and anything pill-shaped (badges, status chips) goes fully rounded.

- **Inputs** — 10px radius, 1px border in the border-subtle token, background one step lighter than the page (`obsidian-surface-2`).
- **Buttons** — 12px radius.
- **Cards / panels** — 14px radius, always with a 1px border-subtle edge even on a filled background (the border, not the shadow, is what defines a flat card's boundary at rest).
- **Badges / status chips / pills** — fully rounded (9999px), always paired with a matching-hue 1px border at ~20% opacity.
- **Small chips, tags, and code snippets** — 6px (`{rounded.2xs}`) or 8px (`{rounded.xs}`), one step below inputs, for compact inline elements that shouldn't compete visually with a full card or button.
- **Modals, slide-overs, and larger surfaces** — 16px (`{rounded.xl}`) or 20px (`{rounded.2xl}`), one step above cards, for containers that hold a card-based layout inside them.

## Components

Buttons, cards, and inputs are all **restrained and instrumented**: precise, information-dense, quietly confident. Emphasis comes only from the violet accent and small, purposeful motion (a shine sweep, a spring-eased lift) — never from decoration, gradients-for-their-own-sake, or heavy borders.

### Buttons
- **Shape:** 12px radius (`{rounded.md}`).
- **Primary:** 135°-diagonal gradient from Electric Violet (`#7C3AED`) to its brighter step (`#9B5CF6`), white text, 600 weight, violet ambient shadow at rest that intensifies on hover; a diagonal light-sweep (`.btn-shine`) plays across the button on hover, translating from off-screen left to off-screen right over 0.7s with a spring easing.
- **Hover / Focus:** 1px lift (`translateY(-1px)`), heavier violet shadow. Because `overflow:hidden` clips the default focus outline, focus-visible state uses a violet box-shadow ring instead (`0 0 0 3px rgba(167,139,250,0.5)`) rather than an outline.
- **Ghost / secondary:** transparent background, border-subtle or violet-border edge, text-tertiary color that shifts to violet on hover — used for "Cancel," "Refresh," and other non-primary actions throughout the app.

### Cards / Containers (`.bento-card`)
- **Corner Style:** 14px radius.
- **Background:** `obsidian-surface` (dark) / white (light), always with a 1px border-subtle edge.
- **Shadow Strategy:** flat at rest; see Elevation & Depth's card-hover shadow on interaction.
- **Internal Padding:** 20px (`p-5`) is the typical default; denser tables/lists sometimes use less.
- A radial violet gradient (`ellipse 80% 60% at 50% -20%`) fades in over the card on hover — a very subtle top-down glow, not a visible gradient at rest.

### Inputs / Fields (`.field-input`)
- **Style:** 10px radius, 1px border-subtle, `obsidian-surface-2` background, `text-primary` text.
- **Focus:** border shifts to a 50%-opacity violet, paired with a soft violet glow ring (`box-shadow: 0 0 0 3px rgba(124,58,237,0.12)`) instead of a default browser outline.

### Badges (`.badge`, `.badge-active`, `.badge-trial`, `.badge-suspended`, `.badge-churned`, `.badge-core`, `.badge-growth`, `.badge-enterprise`)
- **Style:** fully rounded pill, ~10% tint background, ~20% tint border, full-saturation status color as text — 10px, 700-weight, uppercase, 0.08em letter-spacing.
- One variant exists per meaningful state/tier; new states should follow the same tint/border/text formula rather than introducing a new visual language.

### Navigation (Sidebar)
- 256px fixed-width panel, a top-to-bottom gradient from obsidian-void to obsidian-ink, a 1px violet-tinted right border (`rgba(124,58,237,0.1)`).
- Nav items use the same restrained-until-active logic as the rest of the system: quiet at rest, violet accent when active/hovered.

### Tables (`.data-table`)
- Header row: text-tertiary, 11px, no letter-spacing, mono not required (headers are labels, not data).
- Body rows: text-secondary, hover tints the row background with a very faint violet wash (`rgba(124,58,237,0.04)`) rather than lifting or bordering it — tables get the quietest hover treatment in the system because scanning many rows shouldn't feel busy.

## Do's and Don'ts

### Do:
- **Do** keep violet as the only accent hue anywhere in the product — status colors communicate state, they never mean "act here."
- **Do** render numeric/tabular/ID content in JetBrains Mono; render prose in Plus Jakarta Sans.
- **Do** keep cards, buttons, and rows flat at rest — shadows and glows only appear in response to hover/focus/interaction.
- **Do** pair every status badge with the tint/border/text formula (10% bg, 20% border, full-saturation text) rather than a solid fill.
- **Do** check `text-tertiary` against its background before reusing it elsewhere — its current values were deliberately raised from a lower-contrast original to clear WCAG AA, per the comments in `globals.css`.

### Don't:
- **Don't** introduce a second accent hue (a blue, a teal, a second purple) for emphasis — it breaks the "authority through rarity" premise.
- **Don't** give a card or button a resting drop shadow "for depth" — depth here is earned by interaction, not applied by default.
- **Don't** use all-caps body text or oversized eyebrow-style labels outside the established `.eyebrow` pattern (10px mono, 0.18em tracking) — the detector already flagged some undersized/all-caps drift worth cleaning up, not extending.
- **Don't** treat `scripts/zwane-invoice.html` or the transactional email templates in `lib/email.ts` as the design reference — they predate this system and carry known contrast and font-overuse issues (see the `/impeccable polish` backlog); the app's live React pages are the current source of truth.
