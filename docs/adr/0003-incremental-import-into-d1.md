# 3. Incremental import into D1

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

SMARD publishes each series as one file per week with 672 quarter hours. New values keep arriving in the current file: actual generation with a delay of one to two hours, tomorrow's prices once a day. Earlier values can still be corrected.

The free D1 plan allows 100,000 written and 5 million read rows per day ([ADR 1](0001-nuxt-on-cloudflare-workers.md)). Storing the current week of all 17 series again on every run would write about 11,000 rows every 15 minutes, roughly a million per day.

## Decision

**One table, one row per series and quarter hour.**

```sql
CREATE TABLE points (
  series TEXT NOT NULL,
  ts INTEGER NOT NULL,     -- start of the quarter hour, epoch seconds (UTC)
  value REAL NOT NULL,
  PRIMARY KEY (series, ts)
) WITHOUT ROWID;
```

`WITHOUT ROWID` makes the primary key the table itself, so a new value is one written row instead of a row plus an index entry. Timestamps are UTC; the Berlin calendar only matters when a day is read (a day has 92, 96 or 100 quarter hours).

**The import compares before it writes.** Every run:

1. takes a window from 48 hours before to 48 hours after the scheduled time, which touches one or two weekly files per series,
2. reads what is stored for that window in one query,
3. writes only quarter hours that are new or whose value differs, in one transaction,
4. records the run: status, new and corrected values, and the rows D1 reports as read and written.

A series that fails is recorded and skipped; the others are imported (`partial`). If nothing could be read or the database fails, the run is `failed` and nothing is written.

**The scheduled time is the import's clock.** The Cron Trigger is connected to the import task through Nitro's `cloudflare:scheduled` hook rather than `scheduledTasks`, because only the hook passes on the time the run was scheduled for. That makes a run reproducible: a test can run the import for the moment a recording was made.

## Consequences

- **Writes follow the data, not the schedule.** Measured in the integration test with responses recorded on 14 November 2026: the first import of an empty database wrote 3,571 rows; repeating it wrote none; an import of a recording made 23 minutes later wrote 67. D1 counted exactly one written row per new or corrected value.
- **Corrections are real.** Of those 67 values, 21 were new and 46 were corrections of values SMARD had already published: 44 in the load series and 2 in solar generation, between 1 and 12 hours old. Comparing only the newest timestamp per series would have missed them.
- **Reads are the larger number.** Each run reads the window, about 3,600 rows. At 96 runs per day that is roughly 350,000 rows, 7 % of the daily allowance, before any page is served.
- **Corrections older than 48 hours are missed.** Two recordings do not show how late SMARD still corrects values. Every run records how many values it corrected, so the deployed import will show whether the window is wide enough. A wider reconciliation run can be added if needed.
- **History starts at the first deployment.** The import does not backfill. Earlier weeks can be loaded later with the same code and a different window.
- **The import can be observed.** `/api/status` shows the last run and the newest value of every series, which is also what the "48 hours without a gap" criterion of Phase 1 is checked against.
- **CPU time is still unmeasured.** Parsing 17 to 34 files and comparing about 3,600 values has to fit into 10 ms on the free plan. That can only be measured on the deployed Worker.

## Addendum: the import has its own Worker (2026-11-14)

The CPU time was measured after the first deployment and was over the limit while the import shared a Worker with Nuxt ([ADR 4](0004-pages-on-vercel-pipeline-on-cloudflare.md)). The import now runs in a Worker without a framework. Its `scheduled` handler receives the scheduled time directly, so the Nitro hook mentioned above is no longer needed. Table, window and comparison are unchanged.
