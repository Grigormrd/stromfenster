# 8. German at the root, English under /en

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The data is about Germany and most readers will be in Germany, so German is the main language. The project is also a portfolio piece read by people who do not speak German, so English has to be complete, not a summary.

Three things constrain how the two languages are served:

- **Pages are cached** on Vercel with incremental static regeneration ([ADR 6](0006-server-rendered-svg-charts.md)). A cached page must not depend on who asks for it.
- **The answer must be in the HTML**, without JavaScript, in both languages.
- **Numbers and times** are formatted on the server and again in the browser after hydration; both must produce the same text.

## Decision

**Use `@nuxtjs/i18n` with German at the root and English under `/en`** (`prefix_except_default`). The methodology page has a name in each language: `/methodik` and `/en/methodology`.

- **No detection of the browser language.** A redirect by `Accept-Language` would make the cached page differ between visitors, and a shared link should open in the language it was shared in. A link in the footer leads to the same page in the other language.
- **Every page names both versions** in its head: `hreflang` links for `de-DE`, `en-GB` and `x-default` (the German page), a canonical link, `og:locale`, and `lang` on the `html` element.
- **Short texts live in message files** (`i18n/locales/de.json`, `en.json`). The methodology page is long prose with links and emphasis, which is hard to read and to translate as keys; it is a template per language (`components/methodology/ProseDe.vue`, `ProseEn.vue`) with the same sections, while the tables in it are shared components built from the definitions the calculations use.
- **Formatting follows the language, the clock does not.** `de-DE` and `en-GB` decide the decimal separator, the thousands separator and the names of days and months. The time zone is always `Europe/Berlin`, because the market runs on German time; the pages say so.
- **Names stay out of the shared code.** The series catalogue, the generation groups and the emission factors carry ids only; their names and the reasons for a stand-in or a zero factor are in the message files.

## Consequences

- **Two pages per route to cache**, each with its own cache entry. The data request behind them is the same.
- **One more thing to keep in step:** the two prose templates of the methodology. Tests check that both have the same sections, so the links from the start page work in either language, and that the factor and group tables are the same in both.
- **Tests cover both languages** in the Nuxt runtime and in the HTML the built server sends, including the `hreflang` links and that each page's address in the other language is a 404.
- **English uses `en-GB`**: 24-hour times and day-month order, closest to what the German pages show.
- **Not done here:** one page per day, a sitemap, structured data and a link preview image, the rest of Phase 4.
