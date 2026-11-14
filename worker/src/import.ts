import { importWindow } from "../../shared/utils/import-window.ts";
import type { Point, SeriesId } from "../../shared/utils/series.ts";
import { SERIES } from "../../shared/utils/series.ts";
import type { FetchJson } from "./smard.ts";
import { fetchSmardWeek } from "./smard.ts";
import type { ImportRun, SeriesStore } from "./store.ts";

export interface ImportOptions {
  store: SeriesStore;
  fetchJson: FetchJson;
  /** Base URL of the SMARD chart data. */
  baseUrl: string;
  /** The moment the import runs for, in epoch seconds. */
  now: number;
  /** The series this run imports. */
  series: readonly SeriesId[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Brings the given series up to date with SMARD.
 *
 * Looks at a window around `now`, compares what SMARD has with what is stored,
 * and writes only quarter hours that are new or whose value changed. A series
 * that fails does not stop the others. The outcome is recorded as a run, also
 * when nothing could be imported.
 */
export async function runImport(options: ImportOptions): Promise<ImportRun> {
  const { store, fetchJson, baseUrl, now, series } = options;
  const startedAt = Date.now();
  const window = importWindow(now);
  const failures: ImportRun["failures"] = {};
  let inserted = 0;
  let updated = 0;

  const fetched = await Promise.all(
    series.map(async (id): Promise<Point[] | null> => {
      try {
        const weeks = await Promise.all(
          window.weekStarts.map((weekStart) =>
            fetchSmardWeek(fetchJson, baseUrl, SERIES[id], weekStart),
          ),
        );
        return weeks
          .flat()
          .filter((value) => value.start >= window.start && value.start < window.end)
          .map((value) => ({ series: id, start: value.start, value: value.value }));
      } catch (error) {
        failures[id] = message(error);
        return null;
      }
    }),
  );

  const imported = series.filter((_id, index) => fetched[index] !== null);

  try {
    const stored = new Map<string, number>();
    if (imported.length > 0) {
      for (const point of await store.readRange(window.start, window.end, imported)) {
        stored.set(key(point.series, point.start), point.value);
      }
    }

    const changed: Point[] = [];
    for (const point of fetched.flatMap((points) => points ?? [])) {
      const before = stored.get(key(point.series, point.start));
      if (before === undefined) inserted++;
      else if (before !== point.value) updated++;
      else continue;
      changed.push(point);
    }
    await store.write(changed);
  } catch (error) {
    // Nothing was written: a write is one transaction.
    failures.store = message(error);
    inserted = 0;
    updated = 0;
  }

  const failed = Object.keys(failures).length;
  const status: ImportRun["status"] =
    failed === 0
      ? "ok"
      : failures.store !== undefined || imported.length === 0
        ? "failed"
        : "partial";

  const run: ImportRun = {
    ranAt: now,
    durationMs: Date.now() - startedAt,
    series: [...series],
    status,
    inserted,
    updated,
    ...store.usage(),
    failures,
  };
  await store.recordRun(run);
  return run;
}

function key(series: SeriesId, start: number): string {
  return `${series}:${start}`;
}
