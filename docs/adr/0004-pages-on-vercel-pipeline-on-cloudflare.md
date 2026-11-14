# 4. Pages on Vercel, data pipeline on Cloudflare

- **Status:** Accepted
- **Date:** 2026-11-14
- **Supersedes:** [ADR 1](0001-nuxt-on-cloudflare-workers.md) (the single Worker; D1 and the Cron Trigger stay)

## Context

ADR 1 put everything into one Cloudflare Worker and named its risk: the free plan allows 10 ms of CPU time per request and per Cron Trigger. It also said what to do if the limit could not be met: move the pages to Vercel.

The first deployment was measured in the Cloudflare dashboard on 14 November 2026. The Worker contained Nuxt with a placeholder page, the import and the API.

| What ran                                            | CPU time                          |
| --------------------------------------------------- | --------------------------------- |
| Scheduled import (every run)                        | about 28 ms                       |
| Start page, 100 requests in a row                   | P50 about 3 ms, peak about 50 ms  |
| `/api/days`, 100 requests in a row on a warm Worker | P50 about 3 ms, peak about 8.5 ms |
| First requests after a pause                        | up to about 68 ms                 |
| All invocations in the first three hours            | P50 25.9 ms, P99 36.7 ms          |

Two things follow:

- **Warm requests fit, cold starts do not.** Starting the Nuxt bundle costs four to seven times the limit, whatever is requested. Wrangler reported a startup time of 19 ms for it at deployment. A scheduled run pays that price every time, 96 times a day, and so does almost every visit to a site with little traffic.
- **Nothing was terminated.** Cloudflare's documentation says an isolate has "some built-in flexibility" for a Worker that infrequently runs over the limit, and that execution is terminated if it hits the limit consistently. How much flexibility is not documented. The page was still empty; database access, charts and tables will add to the warm cost.

Building the dashboard on that margin would mean relying on an undocumented allowance for every first page view.

## Decision

Split the app along the CPU cost:

- **Cloudflare keeps the data pipeline.** A Worker without a framework (`worker/`) runs the scheduled import, owns the D1 database and serves the data as a small JSON API. Its bundle is 18 KiB instead of 564 KiB.
- **Vercel renders the pages.** The Nuxt app is deployed to Vercel and reads the Worker's API when it renders. Pages are cached with incremental static regeneration (`routeRules` with `isr`), so most requests are served from Vercel's cache and the API is called once per revalidation, not once per visitor.
- **One repository, shared code.** The series catalogue and the Berlin calendar maths live in `shared/` and are used by both sides.

The Cron Trigger now calls the Worker's `scheduled` handler directly, which receives the scheduled time. The Nitro hook described in the addendum to ADR 1 is gone.

## Consequences

- **Rendering is no longer bound to 10 ms.** Vercel Functions on the Hobby plan run with 1 vCPU and up to 300 seconds; usage counts against a monthly allotment instead of a per-request cap.
- **The pipeline is unchanged in behaviour.** Import, storage and API are the same code and pass the same tests in `workerd`. The Worker is now tested from its source; no build of the website is needed for that.
- **Whether the Worker fits into 10 ms still has to be measured** after it is deployed. Locally the import logic takes about 3 ms when warm and 5 to 9 ms in a fresh process. If the deployed runs are still over the limit, the next step is to do less per run: a shorter window, or a part of the series per run.
- **Two platforms, two deployments.** GitHub Actions deploys the Worker; Vercel deploys the site from the same repository. The API is public and allows cross-origin reads, which fits open data.
- **An extra hop when a page is rendered.** If the API is slow or down during a revalidation, Vercel keeps serving the last rendered page. A first render without the API has to show a clear state instead of failing; that is part of Phase 2.
- **Less contrast in hosting to a single-platform app, more in what is shown:** a decision that was written down with its exit condition, measured, and reversed when the numbers said so.

## Addendum: the import was still over the limit (2026-11-14)

The first scheduled run of the new Worker took about 40 ms of CPU time; API requests took 2 to 3 ms. The split removed the cost of starting Nuxt from every page view, but the import was expensive in its own right. [ADR 5](0005-one-series-per-run.md) deals with that.
