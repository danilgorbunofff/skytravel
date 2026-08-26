---
name: SkyTravel
description: Czech tour-aggregator editorial system — trustworthy & warm, clean blues, sun-yellow accents, readable like a printed brochure.
colors:
  primary: "#2666cb"
  primary-deep: "#1b4da8"
  primary-deeper: "#123d8c"
  primary-soft: "#1d4f9e"
  primary-tint: "#d3e2f5"
  primary-tint-soft: "#eaf1fb"
  accent-sun: "#f3d43b"
  ink: "#0f1d2e"
  ink-soft: "#1a2c44"
  text: "#223147"
  muted: "#6b778b"
  bg: "#eef3fa"
  sand: "#fbf7ee"
  white: "#ffffff"
  line: "#d7e0ee"
  sea: "#4ea2d6"
  rust: "#d76a3a"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 5vw + 1rem, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 3vw + 1rem, 3rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "Barlow Condensed, Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.5vw + 1rem, 2rem)"
    fontWeight: 800
    lineHeight: 1.2
  h3:
    fontFamily: "Barlow Condensed, Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontFamily: "Barlow Condensed, Inter, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.1em"
    textTransform: "uppercase"
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.04em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
  "9": "6rem"
  measure: "66ch"
elevation:
  shadow-sm: "0 1px 2px rgba(15, 29, 46, 0.06)"
  shadow-md: "0 8px 24px -8px rgba(15, 29, 46, 0.12)"
  shadow-lg: "0 24px 60px -20px rgba(15, 29, 46, 0.25)"
components:
  button-primary:
    backgroundColor: "{colors.accent-sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
  chip-default:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.pill}"
  chip-yellow:
    backgroundColor: "{colors.accent-sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  chip-rust:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
  input-text:
    backgroundColor: "{colors.white}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
---

# Design System: SkyTravel

## Overview

**Creative North Star: "The Trusted Travel Brochure"** — clean blues, sun-yellow accents, readable like a printed brochure.

SkyTravel's visual system treats the page as if it were a well-printed Czech travel catalogue: a deep editorial blue grounds every surface, a single warm sun-yellow calls the traveller forward, and the typography is the kind that holds up at any column width without shouting. Density is moderate — not a dense dashboard, not an airy portfolio. The page must feel **trustworthy & warm**: trustworthy because a Czech traveller is committing real money to a real trip, warm because a brochure about holidays should never feel corporate. Every visual decision is a trade between "this looks like a serious booking site" and "this looks like the holiday catalogue we used to pick up at the travel agent." The system refuses to lean too hard either way.

The aesthetic is honest rather than flashy. There is no marketing-photograph gloss, no animated gradients, no over-saturated cards. Colours are slightly desaturated, type is comfortable, and the eye should be able to land on a price or a destination name and not have to work to read it. Anti-references: glossy SaaS landing pages, dark-mode agency sites, neumorphic cards, glassmorphism, AI-tinted mesh gradients.

**Key characteristics:**

- One accent colour, used sparingly. The sun-yellow is for primary actions and only primary actions.
- Blue is structural, yellow is signal. The page should be readable with the yellow removed.
- Typography does the editorial work. Images are large, but they share space with type — not stacked above it.
- Every block has a clear vertical rhythm. No "floating in the void" cards.
- Czech-first copy. Diacritics, declension, and reading rhythm are not optional.

## Colors

The palette is deliberately tight: a single blue family, a single yellow, a sand surface, and a near-white background. The blue does the structural work; the yellow does the call-to-action work. The page should still be navigable with the yellow removed.

### Primary

- **Bureau Blue (`--blue-700` #2666cb)** — the headline blue used for links, icons, section labels, and the active accent across buttons and chips. It is the only chromatic identity in the navigation and on action affordances.
- **Bureau Deep (`--blue-800` #1b4da8)** — used for hover states on primary actions, the deep-blue nav header, and any place where primary needs more weight.
- **Bureau Deeper (`--blue-900` #123d8c)** — the darkest blue, reserved for text on light-yellow surfaces and for the strongest contrast moments.
- **Bureau Soft (`--blue-600` #1d4f9e)** — a quiet variant for secondary buttons and muted blue surfaces where `--blue-700` would feel loud.

### Secondary

- **Sun Yellow (`--yellow` #f3d43b)** — the single warm accent. Used for primary CTAs only ("Hledat", "Zobrazit nabídky", "Odeslat poptávku"). Yellow on dark ink, never the other way around. The yellow may be tinted into soft sand for the destination panel background.

### Tertiary

- **Sand (`--sand` #fbf7ee)** — the soft warm surface used as the destination-card container and as the background for "trust" panels. Sand is a surface, not a colour; it carries no text.
- **Sea Blue (`--sea` #4ea2d6)** — used sparingly for the destination-card sky tones and any place where Bureau Blue feels too heavy.
- **Rust (`--rust` #d76a3a)** — used only for the warning / "spät" chip on the editor's tour form. Not a general accent.

### Neutral

- **Ink (`--ink` #0f1d2e)** — the strongest text colour, used for headings and primary copy.
- **Ink Soft (`--ink-soft` #1a2c44)** — secondary text on light surfaces.
- **Text (`--text` #223147)** — the default body text colour.
- **Muted (`--muted` #6b778b)** — captions, metadata, helper text, dates, reading-time labels.
- **Background (`--bg` #eef3fa)** — the page background, a very pale blue.
- **Line (`--line` #d7e0ee)** — borders, dividers, and the soft outline of cards.
- **White (`--white` #ffffff)** — card and panel surfaces.

### Named Rules

**The One Voice Rule.** The sun-yellow accent appears on **≤ 10% of any given screen** and **only on primary actions**. Its rarity is the point. If a yellow button is not asking the traveller to do the next step toward booking, it should be the blue or ink button instead.

**The No-Red Rule.** Red is reserved for validation errors and the explicit `rust` chip. A button, link, or chip in the wrong red is a bug.

## Typography

**Display Font:** Inter (with `system-ui, -apple-system, Segoe UI, sans-serif` fallback)
**Body Font:** Inter (same fallback)
**Label Font:** Inter, uppercase, tracked (same fallback)

Inter is the single family across the whole product. It carries Czech diacritics correctly, has the weight range this system needs (400 / 600 / 700 / 800), and reads as a modern editorial sans rather than a UI-only sans. There is no second family, no serif, no display-only face.

**Character:** confident, modern, brochure-clear. Inter at 700–800 reads as a printed magazine; Inter at 400 reads as a guidebook. The system uses both.

### Hierarchy

- **Display** (Inter 800, `clamp(2.5rem, 5vw + 1rem, 4.5rem)`, 1.05 lh, -0.02em): the hero title on `/blog/` and the largest h1-equivalent moments. Used at most once per page.
- **H1** (Inter 700, `clamp(2rem, 3vw + 1rem, 3rem)`, 1.15 lh, -0.01em): article titles, page titles. One per page.
- **H2** (Barlow Condensed 800, `clamp(1.5rem, 1.5vw + 1rem, 2rem)`, 1.2 lh): section titles, "Nejnovější články", "Destinace", and the editorial card headings on the featured / latest-articles rows. Condensed editorial display face — the only place a second family is sanctioned.
- **H3** (Barlow Condensed 800, 1.25rem, 1.15 lh): card titles, subsection titles, the "Featured article" / "Latest article" h3 inside cards. Same family as H2 for visual continuity; clamp-up allowed on hero / featured cards.
- **Body** (Inter 400, 1.125rem, 1.6 lh): the article prose. Max line length is the **66ch measure** defined below; the body never exceeds it.
- **Small** (Inter 400, 0.875rem, 1.5 lh): captions, dates, reading-time, metadata.
- **Eyebrow** (Barlow Condensed 700, 0.78rem, 0.1em tracking, UPPERCASE): editorial eyebrows over featured / latest cards. Always underlined with a 2px sun-yellow bar; the only place a decorative bar is sanctioned.
- **Label** (Inter 600, 0.8125rem, 0.04em tracking, UPPERCASE): section labels, button text, chip text. Always uppercase. Always tracked.

### Named Rules

**The One Measure Rule.** Long-form prose (article body, blog excerpt, destination description) is constrained to **66ch** (`--measure`). Cards, headlines, and short metadata may exceed it. The 66ch column is sacred for the reading flow; images inside an article align to the same column, not to a wider card.

**The Czech-Diacritics Rule.** Headings, labels, button text, and chips are always rendered with correct Czech diacritics (ě, š, č, ř, ž, ý, á, í, é, ú, ů, ť, ň, ď). No latinised ASCII fallbacks. Body text does not start a sentence with a number or an English word unless it is a brand name.

## Layout

The page is built on three containers that must stay aligned:

- **Page container** — `max-width: 1200px; margin: 0 auto;` for hero, featured, latest articles, destinations, and footer. Always centred.
- **Prose container** — `max-width: var(--measure); margin: 0 auto;` for article body, article header, cover image, prose-end, prev-next, CTA, tag list. Centred.
- **Sidebar / utility** — no fixed sidebar width. The right column on the article page is fluid within the 1200px container.

**Vertical rhythm** is `1.5rem` between paragraphs in prose, `2rem` between prose blocks, and `4rem–6rem` between page sections. The first section under a hero should not start with empty vertical space — the hero's bottom padding and the next section's top margin together must not exceed `4rem`.

**Responsive** is mobile-first, single-column on `<= 720px`, two-column on `> 720px`, full three-column for the destination grid on `> 1024px`. The featured article layout collapses from a 60/40 split to a single column at `720px`.

### Named Rules

**The No-Floating-Block Rule.** A card or block is never rendered with a wide outer container and a narrow inner content region, leaving more than 1.5rem of dead space on either side. If a block would be narrower than its container, it spans the container.

## Elevation & Depth

The system uses **tonal layering**, not shadow. The default surface is `--bg` (very pale blue); card surfaces are `--white`; the destination panel is `--sand`. Depth is communicated by surface tone, not by drop shadow. Soft shadows exist (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) but are reserved for floating UI: the search filter drawer, the lead popup, modal dialogs, and the price-alert modal. Page-level sections do not cast shadows.

### Shadow Vocabulary

- **`shadow-sm`** (`0 1px 2px rgba(15, 29, 46, 0.06)`): inline form hints, the skip-link focus ring.
- **`shadow-md`** (`0 8px 24px -8px rgba(15, 29, 46, 0.12)`): dropdowns, mobile filter drawer, the lead popup.
- **`shadow-lg`** (`0 24px 60px -20px rgba(15, 29, 46, 0.25)`): modal dialogs only.

### Named Rules

**The Flat-By-Default Rule.** A card on the page never has a drop shadow. Shadows appear only on UI that floats above the page (popups, drawers, modals).

## Shapes

Corners are **soft but not pill-shaped**. The system uses three radii:

- `rounded-sm` (6px) — inputs, inline chips, small buttons.
- `rounded-md` (10px) — buttons, large chips, and most card surfaces.
- `rounded-lg` (16px) — destination cards, the destination panel container, the lead popup.
- `rounded-pill` (999px) — only for tag chips and the search hero's filter pills.

Borders are 1px solid in `--line`. There are no double borders, no dashed strokes, no inset outlines. Focus rings are 2px solid `--blue-700` with a 2px offset, never the browser default.

## Components

### Buttons

- **Shape:** `rounded-md` (10px), `--label` typography.
- **Primary:** `--yellow` background, `--ink` text. Padding `0.75rem 1.5rem`. Used once per visible group.
- **Secondary:** `--white` background, `--blue-800` text, 1px `--line` border. Same padding.
- **Ghost:** transparent background, `--blue-700` text. Used for tertiary actions and "back" navigation.
- **Hover / Focus:** primary deepens to `--blue-800` background while keeping ink text; secondary tints to `--blue-50`; ghost underlines. All transitions are `120ms ease-out`.

### Chips

- **Default:** `--blue-100` background, `--blue-800` text, `rounded-pill`. Used for tag chips, filter chips.
- **Yellow:** `--yellow` background, `--ink` text, `rounded-pill`. Used for the CTA tag pill ("Vyhledávač", "Tip").
- **Rust:** `--rust` background, `--white` text, `rounded-pill`. Used only for the editor's "draft" chip.

### Cards / Containers

- **Corner style:** `rounded-lg` (16px) for destination cards and the destination panel; `rounded-md` (10px) for blog post cards, article side cards, and the lead popup.
- **Surface:** `--white` on the page background `--bg`; `--sand` for the destination panel.
- **Border:** 1px solid `--line` for card outlines; no border when the card sits on a different-toned surface (e.g. white on sand).
- **Hover:** card lift is a `transform: translateY(-2px)` plus a `--shadow-md`. No colour change on hover.

### Inputs

- **Text input:** `--white` background, `--text` text, 1px `--line` border, `rounded-md` (10px), padding `0.625rem 0.875rem`.
- **Focus:** border becomes `--blue-700`, 2px focus ring with offset.

### Navigation

- **Header:** `--blue-800` background, `--white` text. Logo on the left, primary nav centre, contact on the right.
- **Active link:** `--yellow` underline (`2px`) under the active item.
- **Footer:** `--ink` background, `--white` text and `--muted` for secondary links.

## Do's and Don'ts

**Do**

- Keep the sun-yellow on primary actions only.
- Constrain long-form prose to `--measure` (66ch). Align cover images, tag lists, prev-next, and the prose-end share row to the same column.
- Use correct Czech diacritics in headings, labels, button text, and chips. Diacritics are part of the brand.
- Pick one accent moment per page. If a section is competing for attention, demote the secondary one to ink or muted.
- Read the existing tokens before inventing a new shade. The palette is closed.

**Don't**

- Don't add drop shadows to page-level cards. Shadows are for floating UI only.
- Don't use red as an accent. Red is for errors and the `rust` chip.
- Don't introduce a second font family. Inter is the system.
- Don't render an image-only block as a tall empty rectangle when no cover image exists — fall back to a deliberate editorial placeholder, not a blank white box.
- Don't let a card float in a wider container with empty space on either side. The No-Floating-Block rule applies.
- Don't write a CTA paragraph that repeats the heading. The new sidebar CTA is "tag pill + heading + short prompt + arrow button," not "heading + button restating the heading."
