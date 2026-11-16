# 9. One page per day, and what search engines read

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The roadmap asked for one page per day, with past days "cached permanently", and for a sitemap, structured data and a link preview image. The site renders on Vercel with incremental static regeneration ([ADR 6](0006-server-rendered-svg-charts.md)) and exists in German and English ([ADR 8](0008-german-and-english.md)).

Two facts shape the day pages:

- **Past days still change.** SMARD corrects published values, and the import overwrites everything in a window of 48 hours ([ADR 3](0003-incremental-import-into-d1.md)). On the first measurement, 46 of 67 changed values in 23 minutes were corrections up to 12 hours old.
- **Cache rules on Vercel are per route**, not per response. `/tag/[date]` has one rule for every date, past or not.

## Decision

**Day pages at `/tag/YYYY-MM-DD` and `/en/day/YYYY-MM-DD`**, from the first day with data (12 November 2026) up to tomorrow. Other dates and anything that is not a real date are a 404. A day the API has no value for is a 404 as well.

Each page shows the day's average, lowest and highest price with their quarter hours, the CO₂ estimate and the renewable share over the measured part of the day, the price and generation charts with their tables, and links to the day before and after. The start page links to yesterday.

**A day page is cached for an hour, not for ever.** "For ever" would keep yesterday's page with values SMARD corrected since. An hour is long enough that a day page is almost always served from the cache, and short enough that corrections arrive the same hour. Rendering a page again costs one request to the pipeline's API.

**A sitemap** at `/sitemap.xml` lists the start page, the methodology and every complete day up to yesterday, in both languages, each address naming its counterpart with `hreflang`. `robots.txt` points to it. It is generated on request and cached for an hour.

**Structured data:** the start page and every day page describe their data as a schema.org `Dataset` in JSON-LD: what is measured, for which period and region, in which language, that it is based on SMARD data of the Bundesnetzagentur under CC BY 4.0, and where the JSON API is. The page itself does not claim a licence for its own content.

**A link preview image** (`/og.png`, 1200 × 630) for every page, with Open Graph and Twitter card tags. It shows the price curve of a recorded day with its cheapest two hours, rendered from data by `pnpm og-image`; it does not show current prices. Title and description of the preview follow the page and its language.

**The English methodology moved** from `/methodology` to `/en/methodology` when German took the root. The old address answers with a permanent redirect.

## Consequences

- **The roadmap item changes from "cached permanently" to "cached for an hour"**, for the reason above. A past day is still served from the cache.
- **The number of pages grows by two a day.** Each is rendered on its first request and then at most once an hour.
- **Tomorrow's day page** exists from the start, with forecasts only until the prices are published; its price chart appears when they are.
- **The preview image is static.** A preview with the current price would need an image rendered per request, which is more than the free plans should carry for a picture.
- **Tests** check day pages in both languages, the 404 cases, the sitemap, `robots.txt`, the redirect, the preview tags and the structured data in the HTML of the built server.
