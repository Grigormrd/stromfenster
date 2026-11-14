import { berlinWeekStart } from "./berlin-time.ts";

/**
 * How far back an import looks. Actual generation arrives one to two hours
 * late and is corrected afterwards; older values are left alone.
 */
export const IMPORT_LOOKBACK_SECONDS = 48 * 3600;

/**
 * How far ahead an import looks. Tomorrow's prices and forecasts end at most
 * 36 hours after they are published.
 */
export const IMPORT_LOOKAHEAD_SECONDS = 48 * 3600;

export interface ImportWindow {
  /** Half-open range of slot starts the import cares about, in epoch seconds. */
  start: number;
  end: number;
  /** SMARD publishes one file per week, starting Monday at midnight in Berlin. */
  weekStarts: number[];
}

export function importWindow(now: number): ImportWindow {
  const start = now - IMPORT_LOOKBACK_SECONDS;
  const end = now + IMPORT_LOOKAHEAD_SECONDS;
  // The window is shorter than a week, so it touches one or two weekly files.
  const weekStarts = [...new Set([berlinWeekStart(start), berlinWeekStart(end - 1)])];
  return { start, end, weekStarts };
}
