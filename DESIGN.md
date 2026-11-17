---
name: Stromfenster
description: When electricity in Germany is cheap and clean, drawn like a guide map.
colors:
  water: "#f5f1e4"
  surface: "#fbf8ef"
  land: "#8ed462"
  on-land: "#2c2e2a"
  on-land-secondary: "#2c4720"
  ink: "#2c2e2a"
  ink-secondary: "#57584f"
  outline: "rgb(44 46 42 / 22%)"
  grid: "#e6e0cd"
  axis: "#c4bca2"
  focus: "#2c2e2a"
  sun: "#ffd23f"
  coral: "#ff6b5a"
  pond: "#4fa6e3"
  lilac: "#ebc1ff"
  capsule-ink: "#2c2e2a"
  price: "#1d5f9a"
  clean: "#3b7a17"
  band-price: "#ffd23f"
  band-clean: "#8ed462"
  price-wash: "#4fa6e3"
  clean-wash: "#8ed462"
  mix-other: "#d9719f"
  mix-coal: "#6a55c9"
  mix-gas: "#f05a47"
  mix-other-renewables: "#1e9c74"
  mix-wind: "#2f86d0"
  mix-solar: "#e09b00"
  dark-water: "#171b17"
  dark-surface: "#212621"
  dark-land: "#7cc452"
  dark-on-land: "#141a10"
  dark-on-land-secondary: "#1d3012"
  dark-ink: "#f5f1e4"
  dark-ink-secondary: "#c5c0ad"
  dark-outline: "rgb(245 241 228 / 16%)"
  dark-grid: "#313831"
  dark-axis: "#4b544b"
  dark-focus: "#f5f1e4"
  dark-price: "#7cc0f0"
  dark-clean: "#a6e07e"
  dark-band-price: "#e6b92a"
  dark-band-clean: "#6fb547"
  dark-price-wash: "#3a8edb"
  dark-clean-wash: "#6fb547"
  dark-mix-other: "#d4588c"
  dark-mix-coal: "#8574e0"
  dark-mix-gas: "#e0533f"
  dark-mix-other-renewables: "#1f9f76"
  dark-mix-wind: "#3a8edb"
  dark-mix-solar: "#c08300"
typography:
  display:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.045em"
  answer:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 4.3vw, 3rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  figure:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  wordmark:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  control:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  label:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.04em"
  chart:
    fontFamily: "Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  focus: "4px"
  tooltip: "12px"
  table: "16px"
  notice: "18px"
  panel: "24px"
  capsule: "999px"
spacing:
  gutter: "clamp(1rem, 4vw, 2.5rem)"
  page: "64rem"
  measure: "42rem"
  panel-padding: "clamp(1.25rem, 3vw, 2rem)"
  stack: "1.5rem"
  section: "3rem"
  page-end: "4rem"
components:
  land:
    backgroundColor: "{colors.land}"
    textColor: "{colors.on-land}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.25rem, 3vw, 2rem)"
  capsule-label:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.capsule-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.capsule}"
    padding: "0.2rem 0.75rem"
  capsule-label-pond:
    backgroundColor: "{colors.pond}"
    textColor: "{colors.capsule-ink}"
  capsule-label-lilac:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.capsule-ink}"
  capsule-label-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.capsule-ink}"
  capsule-radio:
    textColor: "{colors.on-land}"
    typography: "{typography.control}"
    rounded: "{rounded.capsule}"
    padding: "0.45rem 2.3rem 0.45rem 1rem"
  capsule-radio-checked:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.capsule-ink}"
    padding: "0.45rem 1rem 0.45rem 2.3rem"
  capsule-outline:
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.capsule}"
    padding: "0.35rem 1rem"
  capsule-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.water}"
  nav-capsule:
    textColor: "{colors.on-land}"
    rounded: "{rounded.capsule}"
    padding: "0.3rem 0.95rem"
  nav-capsule-current:
    backgroundColor: "{colors.on-land}"
    textColor: "{colors.land}"
  notice:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.capsule-ink}"
    rounded: "{rounded.notice}"
    padding: "0.6rem 1.1rem"
  tooltip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tooltip}"
    padding: "0.35rem 0.6rem"
---

# Design System: Stromfenster

## Overview

**Creative North Star: "The Guide Map"**

Every page is drawn like a zoo or garden guide map. One flat green area of land runs full-bleed from the top edge and carries the page's answer: the wordmark and navigation, the best window, the day's figures, or the page title. Its lower edge is a coastline that swells down into the page. Everything else sits on pale cream water: chart panels, tables, prose and small print.

The world is flat. Colour is unmodulated, there are no shadows and no gradients, and depth comes only from land against water and panel against water. Labels and state ride in rounded capsules in the map's flat colours, always with ink text. One grotesk carries everything, heavy for answers and controls, regular for reading. Dark mode is the same map at night: green-black water, the land kept bright, ink-dark text on it.

The density is that of a tool: a single column of panels, numbers in tabular figures, every chart backed by a table.

**Key Characteristics:**

- One green land area per page, top edge, full-bleed, with a coastline below it.
- Flat colour only; outlines instead of shadows.
- Capsules (999px) for labels, choices, navigation and links that act as buttons.
- One typeface, Hanken Grotesk, self-hosted, variable weight.
- Light and dark values swap in one place, the root stylesheet.

## Colors

A cream-and-green map palette with four bright capsule colours and a separate, validated set of data colours. Light values are the frontmatter tokens without prefix; dark values carry the `dark-` prefix and replace their counterparts under `prefers-color-scheme: dark`.

### Primary

- **Meadow Land** (land / dark-land): the land area, its coastline, and the clean-energy band and wash in charts. Never a text colour.

### Secondary

- **Sun** (sun): the default capsule, the checked duration radio, text selection, and the cheapest-window band.
- **Pond** (pond): the "most wind and solar" capsule and the wash under the price curve.
- **Coral** (coral): notices and warnings, as a filled rounded box with ink text.
- **Lilac** (lilac): a capsule variant for secondary labels.

### Neutral

- **Cream Water** (water / dark-water): the page ground.
- **Paper Surface** (surface / dark-surface): panels, tables and tooltips on the water.
- **Map Ink** (ink / dark-ink): all text on water and surface; outlined capsules; the focus ring.
- **Faded Ink** (ink-secondary / dark-ink-secondary): captions, figure labels, axis text, table headers.
- **On-Land Ink** (on-land, on-land-secondary): text on the land. In dark mode the land stays bright, so these stay dark (dark-on-land, dark-on-land-secondary).
- **Outline** (outline): 1.5px panel and footer borders, ink at 22% (light) or 16% (dark).
- **Grid and Axis** (grid, axis): chart gridlines and table row rules; baselines and day rules.

### Data

- **Price** (price) and **Clean** (clean): the two line series, 2px strokes. Each has a band colour for the best window (band-price is sun, band-clean is land) and a wash under the curve (price-wash is pond, clean-wash is land) at 20% opacity. Bands sit at 45% opacity (60% in dark), their capsule label at full strength.
- **Generation mix** (mix-other, mix-coal, mix-gas, mix-other-renewables, mix-wind, mix-solar): the stacked generation chart and its legend swatches, in that stack order. The six were validated for colour-blind separation between neighbours (worst adjacent pair ΔE 8.8 light under protanopia and 8.4 dark under deuteranopia, target 8; docs/adr/0006), for a shared lightness band and for contrast, in both modes. Stacked areas are separated by a 1.5px stroke in the surface colour.

### Named Rules

**The Ink-Only Text Rule.** Text never takes a series colour. Chart labels, figures and legends are ink or faded ink; the legend carries the names and the table carries the values, because some series colours sit below 3:1 against the surface.

**The Ink-On-Capsule Rule.** Every filled capsule, notice and band label uses capsule ink on its flat colour, in both modes.

**The One-Place Rule.** Light and dark values are defined only in the root custom properties. Components reference tokens, never literals.

## Typography

**Display Font:** Hanken Grotesk (with a metric-adjusted Arial fallback, then system-ui)
**Body Font:** Hanken Grotesk
**Label Font:** Hanken Grotesk

**Character:** A single friendly grotesk, set tight and heavy for answers, open and regular for reading. Self-hosted as one variable Latin subset (SIL Open Font License), `font-display: swap`. Tabular figures are on for the whole page.

### Hierarchy

- **Display** (800, clamp(2.5rem, 6vw, 3.75rem), 0.98, -0.045em): the question on the start page. Day titles use clamp(2.25rem, 6vw, 4rem) at 1.0; long-form titles clamp(2.25rem, 6vw, 3.75rem) at 1.0, -0.04em.
- **Answer** (800, clamp(2.125rem, 4.3vw, 3rem), 1.0, -0.04em): the best-window times on the land.
- **Figure** (700, 1.875rem, 1.2, -0.03em): key figures in definition lists; their terms 600 at 0.875rem in faded ink.
- **Headline** (700, 1.5rem, 1.2, -0.03em): panel and section headings. Sub-headings 1.0625rem to 1.375rem.
- **Lead** (400, 1.1875rem): the sentence under a land title, in on-land-secondary, max 34 to 36rem.
- **Body** (400, 1rem, 1.55): reading text; prose measure 42rem.
- **Control** (700, 1rem, 1.4): capsule radios, outlined capsules, navigation (0.9375rem).
- **Label** (700, 0.8125rem, 0.04em, uppercase): filled capsules and table column headers (0.75rem in chart tables).
- **Chart** (400, 12px; band labels 700 at 11px): axis and tick text in SVG.

### Named Rules

**The Two-Weight Rule.** Heavy (700 to 800) for answers, headings and controls; regular (400) for reading. 600 is reserved for small labels.

**The Tight-Display Rule.** Large type tightens as it grows: -0.02em on headings by default, -0.03em to -0.045em at figure and display size, leading at 1.0 or below for display.

## Layout

A single centred column, `min(64rem, 100% - 2 * gutter)`, with a fluid gutter of clamp(1rem, 4vw, 2.5rem). The land is the only full-bleed element; its inner column uses the same arithmetic, so land content and panels share one left edge. Panels stack in a grid with 1.5rem gaps and 4rem at the page end. Long-form text keeps the same left edge and a 42rem measure by turning the rest of the column into right padding; sections are 3rem apart.

Key figures use an auto-fit grid (min 9.5rem, gaps 1.25rem by 2rem); the two answers on the land use an auto-fit grid (min 17rem, gaps 1.75rem by 3rem). Charts switch between a wide and a narrow drawing with a container query at 34rem. Spacing is fluid with clamp() for land and panel padding and fixed rem steps elsewhere (0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4).

## Elevation & Depth

None. The system has no shadows and no gradients. Depth is the map itself: land over water, and paper-coloured panels outlined at low strength on the water. Tooltips are the only floating element, and they too are flat: surface fill with a 1.5px ink outline.

### Named Rules

**The Flat Map Rule.** No box-shadow, no gradient, no blur. Separation is by flat colour and outline only.

## Shapes

Round and soft. Panels have 24px corners; tables 16px; the notice 18px; tooltips 12px; chart focus rings 8px. Everything that is a label, choice, link-as-button or legend swatch is a full capsule (999px), and small chips inside capsules are circles. Outlines are 1.5px for panels and tooltips, 2px for interactive capsules. The coastline is one SVG path stretched to the full width: a deep lobe on the left and a shallow cove on the right, filled with the land colour and overlapping the land by 1px.

## Components

### Land and Coast

The signature element. A full-bleed block in the land colour at the top of every page: wordmark (800, 1.25rem) and navigation in a wrapping bar, then the page's answer. Below it the coastline hangs into the page at clamp(1.75rem, 4.5vw, 4rem) depth; the land reserves that depth plus a gap as bottom margin. Inside the land, `--focus` becomes on-land and all secondary text uses on-land-secondary. Under forced colours the coast is hidden and the land gets a 1px CanvasText bottom border.

### Capsules (labels)

- **Style:** filled, 0.2rem by 0.75rem padding, label type, capsule ink on sun (default), pond, lilac or coral.
- **Use:** naming an answer ("Cheapest" in sun, "Most wind and solar" in pond) and, in charts, a capsule pinned to the top edge of the best-window band in the band colour (9px corner radius in SVG).

### Capsule Radio (duration choice)

- **Rest:** outlined in on-land (2px), control type, with a round 1.125rem chip on the trailing edge.
- **Checked:** fills with sun, text and chip turn capsule ink, and the chip crosses to the leading edge while the padding swaps sides, on the overshoot curve.
- **Focus:** 3px on-land outline, offset 3px. The native radio stays in the page for keyboard and screen readers.
- **Behaviour:** CSS with `:has()` shows the content for the checked duration, so the choice works without JavaScript.

### Outlined Capsules (navigation, links, toggles)

- **Navigation on land:** 2px on-land outline, 0.3rem by 0.95rem; current page and hover fill with on-land and turn the text land.
- **On water:** 2px ink outline (previous/next day, error-page ways back, the table toggle); hover fills with ink and turns the text water or surface.
- **Chips:** previous/next carry a 1.75rem ink circle with a 2px stroked arrow at the leading or trailing edge; the table toggle carries a chevron that turns 180 degrees on open.

### Cards / Panels

- **Corner Style:** 24px.
- **Background:** surface.
- **Border:** 1.5px outline.
- **Internal Padding:** clamp(1.25rem, 3vw, 2rem).
- **Use:** chart figures, empty and unavailable states.

### Charts

Server-rendered SVG. Gridlines in grid, baseline and day rules in axis, the "now" line and label in ink (label haloed by a 4px surface stroke). Line series are 2px round-joined strokes over a 20% wash. The stacked generation chart uses the six mix colours with surface-coloured seams. Hover shows a crosshair and a flat tooltip; every chart has a table view below it.

### Notice

Coral, 18px corners, 0.6rem by 1.1rem, ink text at 600. Used for data warnings above the panels.

### Link Preview

The 1200 by 630 preview image is drawn in the same world: water ground, a land shape with a coastline, the wordmark at 800, a sun band with its capsule label, and the price line.

### Motion

One curve, `cubic-bezier(0.34, 1.56, 0.64, 1)` (a small overshoot), at 0.4s, for the capsule radio's chip and padding and the toggle chevron. Colour changes take 0.2s, unshaped. Under `prefers-reduced-motion: reduce` all transitions and animations collapse to 0.01ms. Hover fills apply only under `(hover: hover)`, so a tap on a touch screen never leaves a control filled.

## Do's and Don'ts

### Do:

- **Do** put the page's answer on the land, and only one land area per page.
- **Do** use capsule ink on every filled capsule, notice and band label, in both modes.
- **Do** keep text in ink, faded ink or on-land colours; carry series names in the legend and values in the table.
- **Do** use the 3px focus ring in ink, offset 3px (on-land inside the land, 4px offset with 8px corners on charts).
- **Do** meet WCAG 2.1 AA in light and in dark mode, including text on the land.
- **Do** gate hover fills behind `(hover: hover)` and route every shaped transition through the one overshoot curve at 0.4s.
- **Do** add new colours as root custom properties with both a light and a dark value.

### Don't:

- **Don't** use shadows, gradients or blur anywhere.
- **Don't** set text in a series colour, or in land, sun, pond, coral or lilac.
- **Don't** put light text on the land in dark mode; the land stays bright and its text stays dark.
- **Don't** reorder or replace the six generation colours without re-checking neighbour separation, lightness and contrast in both modes.
- **Don't** introduce a second typeface or motion curve.
