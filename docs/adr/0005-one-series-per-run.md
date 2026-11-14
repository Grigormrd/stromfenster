# 5. One series per import run

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

[ADR 4](0004-pages-on-vercel-pipeline-on-cloudflare.md) moved the pages to Vercel and left the import in a Worker without a framework, expecting it to fit into the 10 ms of CPU time the free plan allows per invocation. Its startup time dropped from 19 ms to 2 ms.

The first scheduled run of that Worker was measured in the Cloudflare dashboard on 14 November 2026: about 40 ms. Runs of the earlier Worker, with Nuxt in the bundle, had taken 22 to 48 ms. API requests in the new Worker took 2 to 3 ms.

So the framework was not what made the import expensive. Reading 17 weekly files and comparing about 3,900 values is. A local measurement had put that work at 3 to 9 ms; on Cloudflare it costs several times as much. CPU time cannot be measured inside a Worker, where clocks only advance on I/O, so the dashboard is the only source for these numbers.

No run has been terminated so far. Cloudflare tolerates a Worker that infrequently runs over the limit; an import that is over it on every run is not that.

## Decision

Follow Cloudflare's own advice for this case and process the data in smaller pieces:

- **The Cron Trigger fires every minute, and each run imports one series.** The series take turns (`worker/src/schedule.ts`): the minute of the scheduled time, modulo the number of series, picks the one that is due. With 17 series, each is imported every 17 minutes.
- **A run is still the unit that is recorded.** The log notes which series a run was responsible for. A failing series therefore fails its own run and nothing else.
- **The status summary is computed by the database.** Two days are now 2,880 runs; pulling them into the Worker to add them up would cost the CPU time this change is meant to save. One query with a window function returns the counts and the longest gap between runs.

Considered and not chosen:

- **Durable Objects with alarms.** Their limits page lists 30 seconds of CPU time per request, and also says they have the same per-invocation limits as any Worker. What applies on the free plan is not clear from the documentation.
- **Fewer series per run, but more than one.** Three groups every five minutes would still be around 13 ms per run by the same arithmetic.
- **Running the import elsewhere**, for example in a scheduled GitHub Actions workflow writing to D1 over HTTP. Scheduled workflows are delayed under load and are disabled after 60 days without repository activity, which a finished portfolio project will reach.

## Consequences

- **Expected cost per run:** if 17 series take about 40 ms, one takes 2 to 3 ms, plus a fixed part per invocation that is not known yet. Whether that stays below 10 ms has to be read from the dashboard after deployment.
- **Freshness is unchanged in practice.** SMARD publishes actual values one to two hours late; a series being looked at every 17 instead of every 15 minutes does not show.
- **The log grows faster:** 1,440 rows a day, each with an index entry, so about 2,900 of the 100,000 daily writes. Old runs are not pruned yet.
- **Reads stay the same in total.** A run reads the window of one series, about 230 rows, instead of 3,900 every 15 minutes.
- **"Without a gap" now means a run every minute.** The roadmap criterion for Phase 1 is read from the same summary, with a gap of one minute instead of fifteen.
- **Runs with several series still work** and are covered by unit tests, in case the measurement leaves room to import more than one per run.

## Addendum: measured after deployment (2026-11-14)

The Cloudflare dashboard for the first 20 minutes of one series per run, 20 runs:

|              | CPU time per run |
| ------------ | ---------------- |
| Lowest       | about 5 ms       |
| Median (P50) | 8.2 ms           |
| Highest      | about 14 ms      |

A run now costs a fifth to a third of what it did. About half of the runs stay below 10 ms; the others are between 10 and 14 ms. The same series took 5 ms in one round and 10 to 14 ms in the next, so the spread does not come from the data. The likely cause is whether a run reuses a warm isolate or starts a new one, which cannot be seen from outside.

That is no longer "over the limit on every run by a factor of four", but it is not "always below 10 ms" either. Cloudflare tolerates a Worker that infrequently runs over the limit; how it treats small overruns on about every second run is not documented. No run was terminated: 42 runs since the first deployment, all `ok`, 24 of them in the 24 minutes since the change.

The 48 hours of the Phase 1 criterion are the practical test. A terminated run would show as a gap in `/api/status` and as `Exceeded CPU Time Limits` in the dashboard. If that happens, the next steps are known: skip the weekly file a series cannot have values in (next week's for measured series, last week's for forecasts), and narrow the window per kind of series.

An attempt to profile the Worker locally through the inspector of `wrangler dev` did not give usable numbers: the profile had 5 to 11 samples per run.
