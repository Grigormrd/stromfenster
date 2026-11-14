# 6. Charts as server-rendered SVG, without a chart library

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The start page has to answer its question in the HTML the server sends: the roadmap's test for the dashboard is that it works with JavaScript disabled. It shows three charts (price, expected share of wind and solar, today's generation) and a recommendation that depends on how long the appliance runs.

Chart libraries were considered:

- **Canvas-based libraries** (Chart.js, ECharts in canvas mode) draw in the browser. Without JavaScript there is no chart, the chart is not in the HTML for the first paint, and it is one opaque image to assistive technology.
- **SVG libraries that render on the server** exist, but bring their own DOM handling, their own idea of responsiveness, and tens to hundreds of kilobytes for three charts with a few hundred points.

What the charts need is small: a linear scale, round axis ticks, and a path for a step line or a stacked band.

## Decision

**Vue components render the charts as SVG; the geometry is about a hundred lines in `app/utils/chart.ts`.** The approved plan named d3-scale and d3-shape for the maths; for a linear scale and step paths they were not needed.

**The values are step lines.** A price holds for its quarter hour, so the line is horizontal across the slot and jumps at its end. A gap in the data lifts the pen instead of being interpolated.

**Each chart is drawn twice, wide and narrow, and a container query shows the one that fits.** Scaling a single drawing down to a phone would halve the size of its labels. Both drawings are in the HTML; the choice needs no script. The narrow one has fewer axis labels.

**The duration is chosen with radio buttons and CSS.** The best window for 1, 2, 3 and 4 hours is computed on the server and all four answers, with their bands in the charts, are in the page. A rule with `:has()` shows what belongs to the checked radio button. The choice therefore works before hydration and without JavaScript, and it does not make the cached page vary.

**JavaScript adds, it does not gate.** After hydration the charts get a crosshair and a tooltip, the "now" marker moves, and a tab that has been open for a while fetches fresh data. Every value is also in a table under its chart.

**Colours are checked, not judged by eye.** The six generation groups use a categorical palette whose order was validated for colour-blind separation between neighbours in the stack, in light and in dark mode (worst adjacent pair ΔE 9.2 light, 9.4 dark under deuteranopia; the target is 8). Three of the light colours are below 3:1 against the surface, so the legend carries the names and the table the values. Text never takes a series colour.

**Styling is plain CSS with custom properties.** The plan named Tailwind; the page has few layouts, and the charts are styled through the same tokens as the rest, which swap between light and dark in one place.

## Consequences

- **The answer is in the HTML.** A test starts the built server and checks the recommendations, the six drawings and the rule that switches the duration in what it sends.
- **No chart code is shipped that is not used**, and nothing has to hydrate for the charts to be visible.
- **The page is larger as HTML** than a page that draws on the client: about 91 kB, 20 kB compressed, because each chart is in it twice and the tables as well.
- **Axis, tick and tooltip logic is ours to maintain.** New chart types mean new geometry.
- **The cached page and the clock.** The page is rendered for a moment and cached for five minutes; "now" and the windows are from that moment. The browser corrects the marker after hydration and refetches when the data is older than fifteen minutes or the day has changed. Without JavaScript a visitor sees the state of the last render, with its time in the footer.
- **When the data API is down**, the server answers with 503, `no-store` and a page that says so, instead of caching an empty dashboard.
- **Keyboard access to single values in a chart** is not there yet; the tables are the accessible route. That is part of the accessibility pass in Phase 5.
