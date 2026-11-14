import { describe, expect, it } from "vitest";
import { summariseRuns } from "../../server/utils/run-summary.ts";
import type { ImportRun } from "../../server/utils/store.ts";

const now = Date.parse("2026-11-16T12:00:00Z") / 1000;
const minutes = (count: number) => count * 60;

function run(minutesAgo: number, overrides: Partial<ImportRun> = {}): ImportRun {
  return {
    ranAt: now - minutes(minutesAgo),
    durationMs: 40,
    status: "ok",
    inserted: 17,
    updated: 0,
    rowsRead: 3600,
    rowsWritten: 17,
    failures: {},
    ...overrides,
  };
}

describe("summariseRuns", () => {
  it("reports no runs and no gap for an empty period", () => {
    expect(summariseRuns([], now, 48)).toEqual({
      hours: 48,
      runs: 0,
      ok: 0,
      partial: 0,
      failed: 0,
      longestGapMinutes: null,
      inserted: 0,
      updated: 0,
      rowsRead: 0,
      rowsWritten: 0,
      maxDurationMs: null,
    });
  });

  it("adds up a regular schedule", () => {
    const runs = [
      run(45),
      run(30, { updated: 3, rowsWritten: 20, durationMs: 90 }),
      run(15),
      run(0),
    ];

    expect(summariseRuns(runs, now, 48)).toMatchObject({
      runs: 4,
      ok: 4,
      longestGapMinutes: 15,
      inserted: 68,
      updated: 3,
      rowsRead: 14_400,
      rowsWritten: 71,
      maxDurationMs: 90,
    });
  });

  it("finds a gap between two runs, whatever order they come in", () => {
    const runs = [run(15), run(120), run(30), run(135)];

    expect(summariseRuns(runs, now, 48).longestGapMinutes).toBe(90);
  });

  it("counts the time since the newest run as a gap", () => {
    const runs = [run(200), run(185), run(170)];

    expect(summariseRuns(runs, now, 48).longestGapMinutes).toBe(170);
  });

  it("counts runs by status", () => {
    const runs = [run(30), run(15, { status: "partial" }), run(0, { status: "failed" })];

    expect(summariseRuns(runs, now, 48)).toMatchObject({ runs: 3, ok: 1, partial: 1, failed: 1 });
  });

  it("leaves out runs before the period", () => {
    const runs = [run(49 * 60), run(47 * 60), run(0)];

    expect(summariseRuns(runs, now, 48).runs).toBe(2);
  });
});
