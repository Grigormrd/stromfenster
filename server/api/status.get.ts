import { SERIES_IDS } from "#shared/utils/series";
import type { SeriesId } from "#shared/utils/series";

const iso = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

// How fresh the data is: the last import and the newest value of each series.
export default defineEventHandler(async (event) => {
  const store = storeFromBindings(event.context.cloudflare?.env);
  const [lastRun, latestStarts] = await Promise.all([store.lastRun(), store.latestStarts()]);

  const latest = {} as Record<SeriesId, string | null>;
  for (const id of SERIES_IDS) {
    const start = latestStarts[id];
    latest[id] = start === undefined ? null : iso(start);
  }

  return {
    lastImport: lastRun && {
      ranAt: iso(lastRun.ranAt),
      durationMs: lastRun.durationMs,
      status: lastRun.status,
      inserted: lastRun.inserted,
      updated: lastRun.updated,
      rowsRead: lastRun.rowsRead,
      rowsWritten: lastRun.rowsWritten,
      failures: lastRun.failures,
    },
    latest,
  };
});
