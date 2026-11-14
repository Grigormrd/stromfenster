# 2. SMARD as the data source

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

The app needs, for Germany and in the finest resolution available: day-ahead prices, actual generation per energy source, load, and the forecasts for wind, solar and load. The source must be free, usable without an account or key, and its licence must allow showing the data on a public site.

Four sources were checked with live requests on 13 November 2026:

| Source                         | Key | Resolution     | Licence                                                | Notes                                                                                                |
| ------------------------------ | --- | -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| SMARD (Bundesnetzagentur)      | no  | 15 min, 60 min | CC BY 4.0, attribution "Bundesnetzagentur \| SMARD.de" | Prices, generation per source, load and forecasts. Static JSON files, one per series and week.       |
| Energy-Charts (Fraunhofer ISE) | no  | 15 min         | CC BY 4.0, attribution energy-charts.info              | Documented API. 2 requests per minute per IP and endpoint. Its prices are SMARD's.                   |
| aWATTar                        | no  | 60 min         | terms not found (documentation redirects elsewhere)    | Prices only.                                                                                         |
| ENTSO-E Transparency Platform  | yes | not checked    | not checked                                            | Answers HTTP 401 without a token; needs registration. SMARD names ENTSO-E as the origin of its data. |

## Decision

Use **SMARD** as the only source for now.

- The import reads the weekly quarter-hour files (`/app/chart_data/{filter}/{region}/{filter}_{region}_quarterhour_{week}.json`). A week starts on Monday at midnight in Berlin; the app computes that instead of asking SMARD's index first, which halves the number of requests. A test checks the computation against every week SMARD lists since 2018.
- The 17 series the app uses are listed in one place (`shared/utils/series.ts`) with our own ids, so SMARD's filter numbers do not leak into the database or the API.
- Values are stored as SMARD delivers them: prices in EUR/MWh, energy in MWh per quarter hour.
- Every API response names the source and the licence.

Energy-Charts was the alternative. Its rate limit counts per IP address, and a Worker shares its outgoing addresses with other Cloudflare customers, so the limit could be used up by someone else. It remains an option for a cross-check later.

## Consequences

- **No account, no secret.** The pipeline can be run and tested by anyone who clones the repository.
- **The files are what the SMARD website itself loads.** SMARD's data-use page states the licence and the attribution but no rate limit and no promise that the format stays stable. The parser therefore rejects anything unexpected (wrong shape, timestamps off the quarter-hour grid, non-numeric values) instead of guessing, and a failing series does not stop the others.
- **Tests use recorded responses.** Real files are stored under `test/fixtures/smard`, including the weeks in which the clocks changed and a week that does not exist yet (HTTP 404). A script records new ones.
- **No CO₂ figures.** SMARD has none. They will be estimated from the generation mix with published emission factors (Phase 3).
- **Forecasts are partial.** There are forecasts for wind, solar and load, but not for the other sources. For hours that lie ahead, the app can show the expected share of wind and solar, not a full mix.
- **Licence of the prices.** SMARD's data-use page says that legal questions about licensing the wholesale prices are under review. If that changes the terms, the price series needs another look.
