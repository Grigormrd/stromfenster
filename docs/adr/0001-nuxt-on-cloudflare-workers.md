# 1. Nuxt on Cloudflare Workers, with D1 and a Cron Trigger

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Stromfenster shows public electricity market data for Germany. It needs three things from its hosting:

- **Server-rendered pages.** The answer ("the cheapest two hours today start at …") should be in the HTML, for first paint and for search engines.
- **A scheduled import.** Day-ahead prices are published once a day, actual generation arrives every 15 minutes. The import should run every 15 minutes, independently of visitors.
- **A place to keep the data.** Pages should not depend on the source being reachable at request time.

It also has to cost nothing. Two free platforms were considered:

- **Vercel (Hobby).** Nuxt runs well there and incremental static regeneration is built in. Cron jobs on the Hobby plan run at most once per day, with a precision of ±59 minutes. A 15-minute import would need a second scheduler outside Vercel, and a database from a third provider.
- **Cloudflare Workers (Free).** 100,000 requests per day, 5 Cron Triggers per account, 50 subrequests per invocation, and D1 (SQLite) with 5 million rows read and 100,000 rows written per day. Pages, scheduler and database are one deployment.

## Decision

Run the whole app as **one Cloudflare Worker**:

- Nuxt 4 is built with Nitro's `cloudflare_module` preset. The Worker renders pages and answers the API routes; static files are served as Worker assets.
- The import is a Nitro scheduled task. Nitro turns `scheduledTasks` into a Cron Trigger in the generated Wrangler configuration.
- Time series are stored in **D1**. Storage is accessed through a small interface, so the rest of the code does not depend on D1.
- Rendered pages are cached and revalidated when new data arrives, so most requests do not render at all.

## Consequences

- **One platform, one deployment.** No second scheduler, no separate database provider, no secrets shared between services.
- **Production-like tests.** The production build runs locally in `workerd`, the runtime Cloudflare uses; server routes and the import can be tested against a real D1 there.
- **CPU time is the tight limit.** The free plan allows 10 ms of CPU time per request and per Cron Trigger. Cloudflare's own documentation puts server-side rendering at typically 10–20 ms. Phase 1 measures both on the deployed Worker before anything is built on top. Caching rendered pages and drawing charts as a few SVG paths instead of many elements keep rendering cheap.
- **Writes have a budget.** A week of 15-minute values for all series is roughly 10,000 rows. Rewriting that on every import would exceed 100,000 rows per day, so the import only writes rows that are new or have changed.
- **Fallback.** If the CPU limit cannot be met, the app moves to Vercel with incremental static regeneration, and the import needs a different scheduler. The storage interface keeps that move small.
- **Vendor lock-in** is limited to the storage adapter and the scheduler binding. Pages, components and the domain logic are plain Nuxt and TypeScript.
