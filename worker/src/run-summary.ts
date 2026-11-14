import type { ImportRun } from "./store.ts";

export interface RunSummary {
  /** Length of the period the summary covers. */
  hours: number;
  runs: number;
  ok: number;
  partial: number;
  failed: number;
  /**
   * Longest time without a run, in minutes: between two runs, or since the
   * newest one. `null` when there was no run in the period.
   */
  longestGapMinutes: number | null;
  /** Values that were new, and values SMARD had corrected. */
  inserted: number;
  updated: number;
  /** Rows as counted by the database; the plan limits both per day. */
  rowsRead: number;
  rowsWritten: number;
  /** Slowest run, wall-clock time. */
  maxDurationMs: number | null;
}

/** Sums up the runs of the last `hours` hours before `now` (epoch seconds). */
export function summariseRuns(runs: readonly ImportRun[], now: number, hours: number): RunSummary {
  const since = now - hours * 3600;
  const recent = runs
    .filter((run) => run.ranAt >= since && run.ranAt <= now)
    .sort((a, b) => a.ranAt - b.ranAt);

  let longestGap: number | null = null;
  recent.forEach((run, index) => {
    const next = recent[index + 1]?.ranAt ?? now;
    longestGap = Math.max(longestGap ?? 0, next - run.ranAt);
  });

  const count = (status: ImportRun["status"]) =>
    recent.filter((run) => run.status === status).length;
  const sum = (pick: (run: ImportRun) => number) =>
    recent.reduce((total, run) => total + pick(run), 0);

  return {
    hours,
    runs: recent.length,
    ok: count("ok"),
    partial: count("partial"),
    failed: count("failed"),
    longestGapMinutes: longestGap === null ? null : Math.round(longestGap / 60),
    inserted: sum((run) => run.inserted),
    updated: sum((run) => run.updated),
    rowsRead: sum((run) => run.rowsRead),
    rowsWritten: sum((run) => run.rowsWritten),
    maxDurationMs: recent.length === 0 ? null : Math.max(...recent.map((run) => run.durationMs)),
  };
}
