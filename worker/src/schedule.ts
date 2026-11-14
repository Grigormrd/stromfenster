import type { SeriesId } from "../../shared/utils/series.ts";
import { SERIES_IDS } from "../../shared/utils/series.ts";

/**
 * The series a scheduled run imports.
 *
 * The Cron Trigger fires every minute and each run handles one series, in
 * turn. Importing all of them in one run took about four times the CPU time
 * the free plan allows per invocation (docs/adr/0005). A series comes round
 * again after as many minutes as there are series.
 *
 * `now` is the scheduled time in epoch seconds.
 */
export function seriesForRun(now: number): SeriesId[] {
  const minute = Math.floor(now / 60);
  const id = SERIES_IDS[minute % SERIES_IDS.length];
  return id ? [id] : [];
}
