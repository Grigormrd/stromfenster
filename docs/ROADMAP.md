# Roadmap

Goal for v1: a page that answers "when should I run the washing machine?" in five seconds. It shows today's and tomorrow's electricity prices in Germany, how clean the electricity is, and the best time window for an appliance. The answer is already in the HTML the server sends.

## Phase 0: Foundation ✅

- [x] Nuxt 4, Vue 3 (Composition API), TypeScript strict with `noUncheckedIndexedAccess`
- [x] ESLint, Prettier
- [x] Vitest with two projects: plain unit tests and tests inside a Nuxt runtime
- [x] Production build for Cloudflare Workers ([ADR 1](adr/0001-nuxt-on-cloudflare-workers.md)), checked locally in `workerd`
- [x] GitHub Actions CI (format, lint, typecheck, test, build)

**Done when:** `pnpm check` is green locally and in CI.

## Phase 1: Data pipeline ✅

- [x] SMARD client for day-ahead prices, generation per source, load and forecasts (15-minute resolution) ([ADR 2](adr/0002-smard-as-data-source.md))
- [x] Normalisation into one time series model, tested against recorded SMARD responses, including the days the clocks change (92 and 100 quarter hours)
- [x] D1 schema and an import that only writes new and corrected rows ([ADR 3](adr/0003-incremental-import-into-d1.md))
- [x] Scheduled import on a Cloudflare Cron Trigger
- [x] API routes that read from D1, tested with the Worker in `workerd`
- [x] First deployment, with the D1 database and the Cron Trigger; every push to `main` deploys after green checks
- [x] Measure CPU time per request and per import on the deployed Worker: over the limit while Nuxt and the import shared a Worker ([ADR 4](adr/0004-pages-on-vercel-pipeline-on-cloudflare.md))
- [x] Pipeline (import, D1, API) as its own Worker without a framework
- [x] Website deployed to Vercel
- [x] Measure the CPU time of the pipeline Worker: API requests fit, an import of all series does not ([ADR 5](adr/0005-one-series-per-run.md))
- [x] Import one series per run, every minute
- [x] Measure the CPU time of an import run again: median 8.2 ms, between 5 and 14 ms; about half of the runs are below 10 ms ([ADR 5](adr/0005-one-series-per-run.md))
- [x] 48 hours without a terminated run: 2,881 runs from 14 to 16 November 2026, all `ok`, longest gap one minute

**Done when:** the import has run for 48 hours without a gap (one run per minute) and without a run terminated for CPU time.

## Phase 2: Dashboard ✅

- [x] Price chart for today and tomorrow, rendered on the server as SVG ([ADR 6](adr/0006-server-rendered-svg-charts.md))
- [x] Chart of the expected share of wind and solar, from the forecasts
- [x] Generation mix chart for today, in six groups
- [x] "Best window": the cheapest window and the one with the most wind and solar, for 1 to 4 hours, chosen without JavaScript
- [x] Page cached on Vercel with incremental static regeneration, reading the pipeline's API; an open tab refreshes itself
- [x] States for missing data: the API does not answer, tomorrow's prices are not published yet, no price for the current quarter hour
- [x] Check the cached page on Vercel: a page older than five minutes is served once more and rendered again in the background

**Done when:** with JavaScript disabled, the start page shows today's chart and a recommendation.

## Phase 3: CO₂ and methodology ✅

- [x] CO₂ intensity estimated from the generation mix, with the direct emission factors of the Umweltbundesamt ([ADR 7](adr/0007-co2-estimate-from-the-generation-mix.md))
- [x] Share of wind and solar for the hours that only have forecasts
- [x] Methodology page: what is measured, what is estimated, what is left out (imports and exports); its tables are built from the definitions the calculations use
- [x] Clear note that the wholesale price is not the household price

**Done when:** every number on the page can be traced to its source.

## Phase 4: Languages and SEO

- [x] German and English with `@nuxtjs/i18n`, numbers and times formatted for `Europe/Berlin` on server and client ([ADR 8](adr/0008-german-and-english.md))
- [ ] One page per day; past days are cached permanently
- [x] `hreflang` and canonical links on every page
- [ ] Sitemap, structured data, link preview image

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
