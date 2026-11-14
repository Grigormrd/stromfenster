import type { D1Database } from "@cloudflare/workers-types";
import type { Point, SeriesId } from "../../shared/utils/series.ts";
import { SERIES_IDS } from "../../shared/utils/series.ts";

export interface ImportRun {
  /** The moment the import ran for (its scheduled time), in epoch seconds. */
  ranAt: number;
  /** Wall-clock time the import took. */
  durationMs: number;
  /** The series this run was responsible for. */
  series: SeriesId[];
  /** `partial`: some series could not be imported, the others were. */
  status: "ok" | "partial" | "failed";
  /** Quarter hours that were new. */
  inserted: number;
  /** Quarter hours whose value SMARD had corrected. */
  updated: number;
  /** Rows the import read and wrote, as counted by the database. */
  rowsRead: number;
  rowsWritten: number;
  /** Error message per series that failed. */
  failures: Partial<Record<SeriesId | "store", string>>;
}

export interface RunSummary {
  runs: number;
  ok: number;
  partial: number;
  failed: number;
  /** Longest time between two consecutive runs, in seconds; `null` with fewer than two runs. */
  longestGapSeconds: number | null;
  /** Values that were new, and values SMARD had corrected. */
  inserted: number;
  updated: number;
  /** Rows as counted by the database; the plan limits both per day. */
  rowsRead: number;
  rowsWritten: number;
  /** Slowest run, wall-clock time. */
  maxDurationMs: number | null;
}

/**
 * Everything the app needs from its database. The rest of the code depends on
 * this interface, not on D1.
 */
export interface SeriesStore {
  /** Points with `start <= point.start < end`, for the given series. */
  readRange(start: number, end: number, series?: readonly SeriesId[]): Promise<Point[]>;
  /** Inserts new points and overwrites existing ones. */
  write(points: readonly Point[]): Promise<void>;
  recordRun(run: ImportRun): Promise<void>;
  /** The run with the latest scheduled time. */
  lastRun(): Promise<ImportRun | null>;
  /** Sums up the runs with `since <= ranAt <= until` (epoch seconds). */
  summariseRuns(since: number, until: number): Promise<RunSummary>;
  /** Start of the newest quarter hour stored per series. */
  latestStarts(): Promise<Partial<Record<SeriesId, number>>>;
  /** Rows read and written through this store so far, as counted by the database. */
  usage(): { rowsRead: number; rowsWritten: number };
}

// A statement carries its points as one JSON parameter, which keeps the number
// of statements (and bound parameters) small. 1,000 points are about 45 kB.
const WRITE_CHUNK = 1000;

export function createD1Store(db: D1Database): SeriesStore {
  // D1 reports what each statement cost. The free plan limits both numbers
  // per day, so the import records them.
  const used = { rowsRead: 0, rowsWritten: 0 };
  const track = (meta: { rows_read?: number; rows_written?: number }) => {
    used.rowsRead += meta.rows_read ?? 0;
    used.rowsWritten += meta.rows_written ?? 0;
  };

  return {
    usage: () => ({ ...used }),

    async readRange(start, end, series = SERIES_IDS) {
      const { results, meta } = await db
        .prepare(
          `SELECT series, ts, value FROM points
           WHERE series IN (SELECT value FROM json_each(?1)) AND ts >= ?2 AND ts < ?3
           ORDER BY series, ts`,
        )
        .bind(JSON.stringify(series), start, end)
        .all<{ series: SeriesId; ts: number; value: number }>();
      track(meta);
      return results.map((row) => ({ series: row.series, start: row.ts, value: row.value }));
    },

    async write(points) {
      if (points.length === 0) return;
      const insert = db.prepare(
        `INSERT INTO points (series, ts, value)
         SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]')
         FROM json_each(?1) WHERE true
         ON CONFLICT (series, ts) DO UPDATE SET value = excluded.value`,
      );
      const statements = [];
      for (let offset = 0; offset < points.length; offset += WRITE_CHUNK) {
        const chunk = points
          .slice(offset, offset + WRITE_CHUNK)
          .map((point) => [point.series, point.start, point.value]);
        statements.push(insert.bind(JSON.stringify(chunk)));
      }
      // A batch is a transaction: either all chunks are written or none.
      for (const result of await db.batch(statements)) track(result.meta);
    },

    async recordRun(run) {
      await db
        .prepare(
          `INSERT INTO import_runs
             (ran_at, duration_ms, series, status, inserted, updated, rows_read, rows_written, failures)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        )
        .bind(
          run.ranAt,
          run.durationMs,
          JSON.stringify(run.series),
          run.status,
          run.inserted,
          run.updated,
          run.rowsRead,
          run.rowsWritten,
          JSON.stringify(run.failures),
        )
        .run();
    },

    async lastRun() {
      const row = await db
        .prepare(
          `SELECT ran_at, duration_ms, series, status, inserted, updated, rows_read, rows_written, failures
           FROM import_runs ORDER BY ran_at DESC, id DESC LIMIT 1`,
        )
        .first<{
          ran_at: number;
          duration_ms: number;
          series: string;
          status: ImportRun["status"];
          inserted: number;
          updated: number;
          rows_read: number;
          rows_written: number;
          failures: string;
        }>();
      if (!row) return null;
      return {
        ranAt: row.ran_at,
        durationMs: row.duration_ms,
        series: JSON.parse(row.series) as SeriesId[],
        status: row.status,
        inserted: row.inserted,
        updated: row.updated,
        rowsRead: row.rows_read,
        rowsWritten: row.rows_written,
        failures: JSON.parse(row.failures) as ImportRun["failures"],
      };
    },

    async summariseRuns(since, until) {
      // Added up by the database: with a run every minute, two days are 2,880
      // rows, too many to pull into the Worker for a status request.
      const row = await db
        .prepare(
          `SELECT
             COUNT(*) AS runs,
             COALESCE(SUM(status = 'ok'), 0) AS ok,
             COALESCE(SUM(status = 'partial'), 0) AS partial,
             COALESCE(SUM(status = 'failed'), 0) AS failed,
             MAX(gap) AS longest_gap,
             COALESCE(SUM(inserted), 0) AS inserted,
             COALESCE(SUM(updated), 0) AS updated,
             COALESCE(SUM(rows_read), 0) AS rows_read,
             COALESCE(SUM(rows_written), 0) AS rows_written,
             MAX(duration_ms) AS max_duration_ms
           FROM (
             SELECT status, inserted, updated, rows_read, rows_written, duration_ms,
                    LEAD(ran_at) OVER (ORDER BY ran_at, id) - ran_at AS gap
             FROM import_runs
             WHERE ran_at >= ?1 AND ran_at <= ?2
           )`,
        )
        .bind(since, until)
        .first<{
          runs: number;
          ok: number;
          partial: number;
          failed: number;
          longest_gap: number | null;
          inserted: number;
          updated: number;
          rows_read: number;
          rows_written: number;
          max_duration_ms: number | null;
        }>();
      return {
        runs: row?.runs ?? 0,
        ok: row?.ok ?? 0,
        partial: row?.partial ?? 0,
        failed: row?.failed ?? 0,
        longestGapSeconds: row?.longest_gap ?? null,
        inserted: row?.inserted ?? 0,
        updated: row?.updated ?? 0,
        rowsRead: row?.rows_read ?? 0,
        rowsWritten: row?.rows_written ?? 0,
        maxDurationMs: row?.max_duration_ms ?? null,
      };
    },

    async latestStarts() {
      // One lookup per series at the end of its key range. A single
      // GROUP BY query would read every row of the table instead.
      const newest = db.prepare(`SELECT MAX(ts) AS ts FROM points WHERE series = ?1`);
      const results = await db.batch<{ ts: number | null }>(
        SERIES_IDS.map((series) => newest.bind(series)),
      );
      const latest: Partial<Record<SeriesId, number>> = {};
      SERIES_IDS.forEach((series, index) => {
        const ts = results[index]?.results[0]?.ts;
        if (typeof ts === "number") latest[series] = ts;
      });
      return latest;
    },
  };
}
