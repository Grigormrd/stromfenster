import { describe, expect, it } from "vitest";
import { berlinDayStart } from "../../shared/utils/berlin-time.ts";
import type { Point, SeriesId } from "../../shared/utils/series.ts";
import { SERIES } from "../../shared/utils/series.ts";
import { runImport } from "../../worker/src/import.ts";
import { smardWeekUrl } from "../../worker/src/smard.ts";
import type { ImportRun, SeriesStore } from "../../worker/src/store.ts";
import { readWeekFixture, recordedAt } from "../fixtures/smard.ts";

// The import against D1 is covered in test/worker. These tests are about how a
// run with several series deals with failures, which the scheduled runs (one
// series each) never produce. The store is a plain in-memory one.

const BASE = "https://smard.test";
const now = recordedAt("snapshot-a");
const week = berlinDayStart("2026-11-09");

function memoryStore(options: { failWrites?: boolean } = {}) {
  const points = new Map<string, Point>();
  const runs: ImportRun[] = [];
  const store: SeriesStore = {
    async readRange(start, end, series = []) {
      return [...points.values()].filter(
        (point) => series.includes(point.series) && point.start >= start && point.start < end,
      );
    },
    async write(changed) {
      if (options.failWrites) throw new Error("database is unavailable");
      for (const point of changed) points.set(`${point.series}:${point.start}`, point);
    },
    async recordRun(run) {
      runs.push(run);
    },
    lastRun: async () => runs.at(-1) ?? null,
    summariseRuns: async () => {
      throw new Error("not used here");
    },
    latestStarts: async () => ({}),
    usage: () => ({ rowsRead: 0, rowsWritten: 0 }),
  };
  return { store, points, runs };
}

/** Serves the recorded files of the given series; anything else is a server error. */
function recordedFetch(available: readonly SeriesId[]) {
  const files = new Map(
    available.map((id) => [
      smardWeekUrl(BASE, SERIES[id], week),
      readWeekFixture("snapshot-a", id, week),
    ]),
  );
  return async (url: string) => {
    if (files.has(url)) return files.get(url);
    // The following week did not exist when the recording was made.
    if (available.some((id) => url.startsWith(`${BASE}/${SERIES[id].filter}/`))) return null;
    throw new Error(`GET ${url} answered with HTTP 500`);
  };
}

describe("runImport with several series", () => {
  const series: SeriesId[] = ["price_day_ahead", "load", "generation_solar"];

  it("imports all of them and records one run", async () => {
    const { store, points, runs } = memoryStore();

    const run = await runImport({
      store,
      fetchJson: recordedFetch(series),
      baseUrl: BASE,
      now,
      series,
    });

    expect(run).toMatchObject({ status: "ok", series, updated: 0, failures: {} });
    expect(run.inserted).toBe(points.size);
    expect(new Set([...points.values()].map((point) => point.series))).toEqual(new Set(series));
    expect(runs).toEqual([run]);
  });

  it("is partial when one series fails, and still imports the others", async () => {
    const { store, points } = memoryStore();

    const run = await runImport({
      store,
      fetchJson: recordedFetch(["price_day_ahead", "load"]),
      baseUrl: BASE,
      now,
      series,
    });

    expect(run.status).toBe("partial");
    expect(Object.keys(run.failures)).toEqual(["generation_solar"]);
    expect(run.failures.generation_solar).toContain("HTTP 500");
    expect(new Set([...points.values()].map((point) => point.series))).toEqual(
      new Set(["price_day_ahead", "load"]),
    );
  });

  it("is failed when no series could be read", async () => {
    const { store, points, runs } = memoryStore();

    const run = await runImport({
      store,
      fetchJson: recordedFetch([]),
      baseUrl: BASE,
      now,
      series,
    });

    expect(run.status).toBe("failed");
    expect(Object.keys(run.failures).sort()).toEqual([...series].sort());
    expect(points.size).toBe(0);
    expect(runs).toHaveLength(1);
  });

  it("is failed and counts nothing when the database rejects the write", async () => {
    const { store, runs } = memoryStore({ failWrites: true });

    const run = await runImport({
      store,
      fetchJson: recordedFetch(series),
      baseUrl: BASE,
      now,
      series,
    });

    expect(run).toMatchObject({ status: "failed", inserted: 0, updated: 0 });
    expect(run.failures.store).toContain("database is unavailable");
    expect(runs).toHaveLength(1);
  });

  it("counts corrected values as updates on the next run", async () => {
    const { store, points } = memoryStore();
    const options = { store, fetchJson: recordedFetch(series), baseUrl: BASE, now, series };
    await runImport(options);
    const [key, point] = [...points.entries()][0]!;
    points.set(key, { ...point, value: point.value + 1 });

    const run = await runImport(options);

    expect(run).toMatchObject({ status: "ok", inserted: 0, updated: 1 });
    expect(points.get(key)?.value).toBe(point.value);
  });
});
