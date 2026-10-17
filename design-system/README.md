# Mete Business Blueprint

The interface and report look for Mete Business Consulting's Business Blueprint: the app that takes a business idea through research, CAP (Customer Acquisition Program), OPS (Operations Performance System), a financial model and a 90-day launch plan, and produces a client-ready blueprint report. The brand is set by the Mete Blueprint V2 design spec: navy #1B2A4E, brass gold #C9A227, warm white backgrounds, slate text, WCAG AA contrast.

> No logo or font files exist yet. Typefaces are IBM Plex Serif and IBM Plex Sans, loaded from Google Fonts. When a Mete logo exists, add it as an asset group and replace the wordmark rule below.

## Content fundamentals

- Write for a first-time entrepreneur. Plain words, short sentences, numbers with units ("$1,240 / month", "36 trays / week").
- Every figure says where it came from: **Verified** (sourced, dated), **Estimated** (third-party or benchmark), **User input**, or **Assumption** (model default). Show the tag beside the value.
- Never call revenue "profit". Contribution, operating result and cash are named separately.
- Permits and licenses read "Verify with authority". Never imply an approval.
- Mock or seeded data is labeled "Illustrative" wherever it appears.

## Visual foundations

- **Ground:** `bg` for the page, `surface` for cards and tables, `surface-2` for the sidebar and table headers. Cards get a `line` outline and `radius-md`; no drop shadows.
- **Text:** `ink` for content, `ink-muted` for explanations and timestamps. Control borders use `border` (3:1), never `line`.
- **Navy** (`navy`, text `on-navy`) is the working color: primary buttons, active navigation, links, focus rings and report headings. `navy-tint` marks selection.
- **Brass** is the accent and stays rare: the Generate Blueprint action, progress fills, the top-three action markers and the report cover rule. Brass is a fill; when brass must be text, use `brass-ink`.
- **Status chips:** Draft (`surface-2` / `ink-muted`), Researching (`navy-tint` / `navy`), Needs Review (`brass-soft` / `brass-ink`), Ready (`ok-soft` / `ok`), Published (`navy` / `on-navy`). Each chip carries its word; color is never the only signal.
- **Type:** IBM Plex Serif for screen and report titles (`display`, `heading-1`); IBM Plex Sans for everything else. Figures use tabular numerals.
- **Spacing:** 4px base: `space-1` through `space-8`. Desktop screens pad `space-8`, phones `space-4`.

## Layout

Desktop: left sidebar with the twelve sections, a top project/status bar with Save, Research, Recalculate, Generate Blueprint, Export and Share. Phones: the sidebar collapses behind a menu button; the action bar scrolls sideways.

## Logo

No logo yet. Set "Mete Business Blueprint" in IBM Plex Serif 600 in `navy`. Do not draw a stand-in mark.
