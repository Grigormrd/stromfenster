/**
 * The data pipeline end to end, in the runtime it is deployed to: the Worker
 * runs in workerd with a real D1 database. Only SMARD is replaced, by a local
 * server that serves responses recorded from it.
 */
import { join } from "node:path";
import type { D1Database } from "@cloudflare/workers-types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { berlinDateKey, berlinDayStart } from "../../shared/utils/berlin-time.ts";
import {
  IMPORT_LOOKAHEAD_SECONDS,
  IMPORT_LOOKBACK_SECONDS,
} from "../../shared/utils/import-window.ts";
import { RESOLUTION_SECONDS, SERIES_IDS } from "../../shared/utils/series.ts";
import type { SeriesId } from "../../shared/utils/series.ts";
import { seriesForRun } from "../../worker/src/schedule.ts";
import { readWeekFixture, recordedAt } from "../fixtures/smard.ts";
import type { SmardServer } from "./smard-server.ts";
import { startSmardServer } from "./smard-server.ts";

const WRANGLER_CONFIG = join(import.meta.dirname, "..", "..", "worker", "wrangler.jsonc");
const CRON = "* * * * *";
const MINUTE = 60;

// Two recordings of the same week, made some time apart.
const FIRST = "snapshot-a";
const LATER = "snapshot-b";
const firstAt = recordedAt(FIRST);
const laterAt = recordedAt(LATER);
const week = berlinDayStart("2026-11-09");

/** One round: a run per minute until every series has had its turn. */
const round = (start: number) => SERIES_IDS.map((_id, index) => start + index * MINUTE);

interface DayResponse {
  date: string;
  slots: number;
  start: string;
  series: Record<SeriesId, (number | null)[]>;
  source: { name: string; license: string };
}

interface StatusResponse {
  lastImport: {
    ranAt: string;
    series: SeriesId[];
    status: "ok" | "partial" | "failed";
    inserted: number;
    updated: number;
    rowsRead: number;
    rowsWritten: number;
    failures: Record<string, string>;
  } | null;
  recent: {
    hours: number;
    runs: number;
    ok: number;
    partial: number;
    failed: number;
    longestGapMinutes: number | null;
    inserted: number;
    updated: number;
    rowsWritten: number;
  } | null;
  latest: Record<SeriesId, string | null>;
}

interface RunRow {
  ran_at: number;
  series: string;
  status: string;
  inserted: number;
  updated: number;
  rows_written: number;
  failures: string;
}

/** What a recording holds for one series in the window of an import at `now`, read straight from the file. */
function recordedSeries(recording: string, id: SeriesId, now: number): Map<string, number> {
  const points = new Map<string, number>();
  const { series } = readWeekFixture(recording, id, week) as { series: [number, number | null][] };
  for (const [milliseconds, value] of series) {
    const start = milliseconds / 1000;
    const inWindow =
      start >= now - IMPORT_LOOKBACK_SECONDS && start < now + IMPORT_LOOKAHEAD_SECONDS;
    if (value !== null && inWindow) points.set(`${id}:${start}`, value);
  }
  return points;
}

/** What a full round starting at `start` should have imported from a recording. */
function recordedRound(recording: string, start: number): Map<string, number> {
  const points = new Map<string, number>();
  for (const now of round(start)) {
    for (const id of seriesForRun(now)) {
      for (const [key, value] of recordedSeries(recording, id, now)) points.set(key, value);
    }
  }
  return points;
}

const sum = (rows: RunRow[], pick: (row: RunRow) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

describe("data pipeline in the Workers runtime", () => {
  let smard: SmardServer;
  let harness: ReturnType<typeof createTestHarness>;
  let db: D1Database;

  const worker = () => harness.getWorker<{ DB: D1Database }>();
  const getJson = async <T>(path: string) => (await harness.fetch(path)).json() as Promise<T>;
  const status = () => getJson<StatusResponse>("/api/status");
  const runImportAt = (now: number) =>
    worker().scheduled({ cron: CRON, scheduledTime: new Date(now * 1000) });

  /** Runs one import per minute for a whole round and returns the rows it logged. */
  async function runRound(start: number): Promise<RunRow[]> {
    for (const now of round(start)) await runImportAt(now);
    return (await loggedRuns()).slice(-SERIES_IDS.length);
  }

  async function loggedRuns(): Promise<RunRow[]> {
    const { results } = await db
      .prepare(
        "SELECT ran_at, series, status, inserted, updated, rows_written, failures FROM import_runs ORDER BY id",
      )
      .all<RunRow>();
    return results;
  }

  async function storedPoints(): Promise<Map<string, number>> {
    const { results } = await db
      .prepare("SELECT series, ts, value FROM points")
      .all<{ series: string; ts: number; value: number }>();
    return new Map(results.map((row) => [`${row.series}:${row.ts}`, row.value]));
  }

  beforeAll(async () => {
    smard = await startSmardServer(FIRST);
    harness = createTestHarness({
      workers: [{ configPath: WRANGLER_CONFIG, vars: { SMARD_BASE_URL: smard.baseUrl } }],
    });
    await harness.listen();
    await worker().applyD1Migrations("DB");
    db = (await worker().getEnv()).DB;
  });

  afterAll(async () => {
    await harness?.close();
    await smard?.close();
  });

  it("reports that nothing has been imported yet", async () => {
    const { lastImport, recent, latest } = await status();

    expect(lastImport).toBeNull();
    expect(recent).toBeNull();
    expect(Object.keys(latest).sort()).toEqual([...SERIES_IDS].sort());
    expect(Object.values(latest).every((value) => value === null)).toBe(true);
  });

  it("serves an empty grid for a day without data", async () => {
    const day = await getJson<DayResponse>("/api/days/2026-11-14");

    expect(day.slots).toBe(96);
    expect(day.start).toBe("2026-11-13T23:00:00.000Z");
    expect(day.series.price_day_ahead).toEqual(new Array(96).fill(null));
    expect(day.source).toMatchObject({
      name: "Bundesnetzagentur | SMARD.de",
      license: "CC BY 4.0",
    });
  });

  it("imports one series when the Cron Trigger fires", async () => {
    const [due] = seriesForRun(firstAt);
    const expected = recordedSeries(FIRST, due!, firstAt);

    const result = await runImportAt(firstAt);
    const { lastImport } = await status();

    expect(result.outcome).toBe("ok");
    expect(lastImport).toMatchObject({
      ranAt: new Date(firstAt * 1000).toISOString(),
      series: [due],
      status: "ok",
      inserted: expected.size,
      updated: 0,
      // D1 counted one written row per new quarter hour.
      rowsWritten: expected.size,
      failures: {},
    });
    expect(expected.size).toBeGreaterThan(100);
    expect(await storedPoints()).toEqual(expected);
    // This week's file, and next week's, which SMARD does not have yet.
    expect(smard.requests.map((request) => request.status).sort()).toEqual([200, 404]);
  });

  it("has imported every series after one round", async () => {
    // The first minute of the round already ran in the test above.
    for (const now of round(firstAt).slice(1)) await runImportAt(now);
    const runs = await loggedRuns();

    expect(runs).toHaveLength(SERIES_IDS.length);
    expect(runs.every((run) => run.status === "ok")).toBe(true);
    expect(runs.flatMap((run) => JSON.parse(run.series) as string[]).sort()).toEqual(
      [...SERIES_IDS].sort(),
    );
    expect(await storedPoints()).toEqual(recordedRound(FIRST, firstAt));
  });

  it("serves the day on its quarter-hour grid", async () => {
    const today = berlinDateKey(firstAt);
    const day = await getJson<DayResponse>(`/api/days/${today}`);
    const recorded = recordedRound(FIRST, firstAt);
    const dayStart = berlinDayStart(today);
    const slotNow = Math.floor((firstAt - dayStart) / RESOLUTION_SECONDS);

    expect(day.slots).toBe(96);
    // Prices for the whole day were published the day before.
    expect(day.series.price_day_ahead.every((value) => value !== null)).toBe(true);
    expect(day.series.price_day_ahead[0]).toBe(recorded.get(`price_day_ahead:${dayStart}`));
    // Generation is measured: there is a value for the morning, none for tonight.
    expect(day.series.generation_wind_onshore[0]).toBe(
      recorded.get(`generation_wind_onshore:${dayStart}`),
    );
    expect(day.series.generation_wind_onshore.slice(slotNow + 1)).toEqual(
      new Array(96 - slotNow - 1).fill(null),
    );
  });

  it("reports the newest value of each series", async () => {
    const { latest } = await status();
    const recorded = recordedRound(FIRST, firstAt);
    const newest = (id: SeriesId) =>
      Math.max(
        ...[...recorded.keys()]
          .filter((key) => key.startsWith(`${id}:`))
          .map((key) => Number(key.split(":")[1])),
      );

    for (const id of SERIES_IDS) {
      expect(latest[id]).toBe(new Date(newest(id) * 1000).toISOString());
    }
  });

  it("writes nothing when SMARD has not changed", async () => {
    const runs = await runRound(firstAt);

    expect(runs.every((run) => run.status === "ok")).toBe(true);
    expect(sum(runs, (run) => run.rows_written)).toBe(0);
    expect(await storedPoints()).toEqual(recordedRound(FIRST, firstAt));
  });

  it("writes only new and corrected quarter hours from a later snapshot", async () => {
    const before = await storedPoints();
    const later = recordedRound(LATER, laterAt);
    smard.use(LATER);

    const runs = await runRound(laterAt);
    const after = await storedPoints();
    const inserted = sum(runs, (run) => run.inserted);
    const updated = sum(runs, (run) => run.updated);

    // The database now agrees with the later snapshot wherever the import looked ...
    for (const [key, value] of later) expect(after.get(key)).toBe(value);
    // ... and what lies before its window is untouched.
    for (const [key, value] of before) {
      if (!later.has(key)) expect(after.get(key)).toBe(value);
    }
    // It got there by writing the difference, not the whole window.
    expect(runs.every((run) => run.status === "ok")).toBe(true);
    expect(inserted).toBe(after.size - before.size);
    expect(inserted).toBeGreaterThan(0);
    // SMARD had corrected values it published earlier; those are overwritten.
    expect(updated).toBeGreaterThan(0);
    expect(sum(runs, (run) => run.rows_written)).toBe(inserted + updated);
    expect(inserted + updated).toBeLessThan(later.size / 10);
  });

  it("keeps importing the other series when one fails", async () => {
    smard.reset();
    smard.failFor([4068]);
    const before = await storedPoints();

    const runs = await runRound(laterAt);
    const failed = runs.filter((run) => run.status === "failed");

    expect(runs.filter((run) => run.status === "ok")).toHaveLength(SERIES_IDS.length - 1);
    expect(failed).toHaveLength(1);
    expect(JSON.parse(failed[0]!.series)).toEqual(["generation_solar"]);
    expect(JSON.parse(failed[0]!.failures).generation_solar).toContain("HTTP 500");
    expect(await storedPoints()).toEqual(before);
  });

  it("records a failed run when SMARD cannot be reached", async () => {
    smard.reset();
    smard.failFor("all");
    const before = await storedPoints();
    // The minute after the last round.
    const next = laterAt + SERIES_IDS.length * MINUTE;

    await runImportAt(next);
    const { lastImport } = await status();

    expect(lastImport?.ranAt).toBe(new Date(next * 1000).toISOString());
    expect(lastImport?.status).toBe("failed");
    expect(Object.keys(lastImport!.failures)).toEqual(lastImport!.series);
    expect(await storedPoints()).toEqual(before);
    smard.reset();
  });

  it("sums up the runs of the 48 hours before the last one", async () => {
    const runs = await loggedRuns();
    const times = runs.map((run) => run.ran_at).sort((a, b) => a - b);
    const longestGap = Math.max(...times.slice(1).map((time, index) => time - times[index]!));

    const { recent } = await status();

    expect(recent).toMatchObject({
      hours: 48,
      runs: runs.length,
      ok: runs.filter((run) => run.status === "ok").length,
      partial: 0,
      failed: runs.filter((run) => run.status === "failed").length,
      longestGapMinutes: Math.round(longestGap / MINUTE),
      inserted: sum(runs, (run) => run.inserted),
      updated: sum(runs, (run) => run.updated),
      rowsWritten: sum(runs, (run) => run.rows_written),
    });
    // Two rounds for the first recording, two for the later one, one failed run.
    expect(recent!.runs).toBe(4 * SERIES_IDS.length + 1);
    expect(recent!.failed).toBe(2);
    // Between the rounds of the two recordings; within a round it is a minute.
    expect(recent!.longestGapMinutes).toBeGreaterThan(1);
  });

  it("has 92 and 100 quarter hours on the days the clocks change", async () => {
    expect((await getJson<DayResponse>("/api/days/2026-03-29")).slots).toBe(92);
    expect((await getJson<DayResponse>("/api/days/2026-10-25")).slots).toBe(100);
  });

  it.each(["2026-02-30", "tomorrow", "20261114"])("rejects %s as a date", async (date) => {
    const response = await harness.fetch(`/api/days/${date}`);

    expect(response.status).toBe(400);
  });

  it("has no route that starts the import", async () => {
    // Only the Cron Trigger runs the import. `/__scheduled` is the route
    // `wrangler dev --test-scheduled` adds locally; it must not exist otherwise.
    const before = (await status()).lastImport;

    for (const path of ["/__scheduled", "/api/import", "/api/status/run"]) {
      const response = await harness.fetch(path);
      await response.body?.cancel();
      expect(response.status, path).toBe(404);
    }
    const post = await harness.fetch("/api/status", { method: "POST" });
    await post.body?.cancel();

    expect(post.status).toBe(405);
    expect((await status()).lastImport).toEqual(before);
  });

  it("describes itself at the root and lets any site read it", async () => {
    const response = await harness.fetch("/");
    const body = (await response.json()) as { routes: Record<string, string> };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(Object.keys(body.routes)).toEqual([
      "/api/days/YYYY-MM-DD",
      "/api/status",
      "/api/health",
    ]);
  });

  it("answers the health check without touching the database", async () => {
    const health = await getJson<{ status: string; time: string }>("/api/health");

    expect(health.status).toBe("ok");
    expect(Number.isNaN(Date.parse(health.time))).toBe(false);
  });
});
