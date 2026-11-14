import { SERIES_IDS } from "#shared/utils/series";
import type { SeriesId } from "#shared/utils/series";

const SUMMARY_HOURS = 48;
// One run every 15 minutes; a few more in case runs were started by hand.
const RUNS_TO_READ = SUMMARY_HOURS * 4 + 8;

const iso = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

// How fresh the data is: the last import, the imports of the last 48 hours
// and the newest value of each series.
export default defineEventHandler(async (event) => {
  const store = storeFromBindings(event.context.cloudflare?.env);
  const [runs, latestStarts] = await Promise.all([
    store.recentRuns(RUNS_TO_READ),
    store.latestStarts(),
  ]);
  const lastRun = runs[0];

  const latest = {} as Record<SeriesId, string | null>;
  for (const id of SERIES_IDS) {
    const start = latestStarts[id];
    latest[id] = start === undefined ? null : iso(start);
  }

  return {
    lastImport: lastRun
      ? {
          ranAt: iso(lastRun.ranAt),
          durationMs: lastRun.durationMs,
          status: lastRun.status,
          inserted: lastRun.inserted,
          updated: lastRun.updated,
          rowsRead: lastRun.rowsRead,
          rowsWritten: lastRun.rowsWritten,
          failures: lastRun.failures,
        }
      : null,
    recent: summariseRuns(runs, Math.floor(Date.now() / 1000), SUMMARY_HOURS),
    latest,
  };
});
