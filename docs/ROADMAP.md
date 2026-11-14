# Roadmap

Goal for v1: a page that answers "when should I run the washing machine?" in five seconds. It shows today's and tomorrow's electricity prices in Germany, how clean the electricity is, and the best time window for an appliance. The answer is already in the HTML the server sends.

## Phase 0: Foundation ✅

- [x] Nuxt 4, Vue 3 (Composition API), TypeScript strict with `noUncheckedIndexedAccess`
- [x] ESLint, Prettier
- [x] Vitest with two projects: plain unit tests and tests inside a Nuxt runtime
- [x] Production build for Cloudflare Workers ([ADR 1](adr/0001-nuxt-on-cloudflare-workers.md)), checked locally in `workerd`
- [x] GitHub Actions CI (format, lint, typecheck, test, build)

**Done when:** `pnpm check` is green locally and in CI.

## Phase 1: Data pipeline

- [x] SMARD client for day-ahead prices, generation per source, load and forecasts (15-minute resolution) ([ADR 2](adr/0002-smard-as-data-source.md))
- [x] Normalisation into one time series model, tested against recorded SMARD responses, including the days the clocks change (92 and 100 quarter hours)
- [x] D1 schema and an import that only writes new and corrected rows ([ADR 3](adr/0003-incremental-import-into-d1.md))
- [x] Scheduled import as a Nitro task on a Cloudflare Cron Trigger
- [x] Server routes that read from D1, tested with the built Worker in `workerd`
- [ ] First deployment, with the D1 database and the Cron Trigger
- [ ] Measure CPU time per request and per import on the deployed Worker

**Done when:** the import has run for 48 hours without a gap, and the measured CPU time stays below the limit of the free plan.

## Phase 2: Dashboard

- [ ] Price chart for today and tomorrow, rendered on the server as SVG
- [ ] Generation mix chart
- [ ] "Best window": the cheapest and the cleanest time window for a chosen duration
- [ ] Cached pages that revalidate when new data arrives
- [ ] Loading, empty and stale-data states (what the page shows when the source is late)

**Done when:** with JavaScript disabled, the start page shows today's chart and a recommendation.

## Phase 3: CO₂ and methodology

- [ ] CO₂ intensity estimated from the generation mix, with emission factors from a published source (ADR)
- [ ] Share of wind and solar for the hours that only have forecasts
- [ ] Methodology page: what is measured, what is estimated, what is left out (imports and exports)
- [ ] Clear note that the wholesale price is not the household price

**Done when:** every number on the page can be traced to its source.

## Phase 4: Languages and SEO

- [ ] German and English with `@nuxtjs/i18n`, numbers and times formatted for `Europe/Berlin` on server and client
- [ ] One page per day; past days are cached permanently
- [ ] `hreflang`, sitemap, structured data, link preview image

**Done when:** both languages have correct `hreflang` pairs, and a past day is served from the cache.

## Phase 5: Quality

- [ ] Playwright end-to-end tests against the production build
- [ ] Accessibility: axe-core on every page in light and dark mode (WCAG 2.1 AA), charts usable with the keyboard, a data table as an alternative to each chart
- [ ] Error and not-found pages
- [ ] Lighthouse on the production build

**Done when:** axe reports no violations, and the measured Lighthouse scores are in the README.

## Phase 6: Portfolio packaging

- [ ] README with live link, animated preview and final architecture diagram
- [ ] "What was hard" write-up

## Later

Surcharges to estimate the price of a dynamic tariff, a second data source as a cross-check, notifications for cheap windows, other bidding zones.
