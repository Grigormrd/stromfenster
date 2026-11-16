import type { BestWindow } from "#shared/utils/best-window";
import type { Timeline } from "#shared/utils/timeline";
import type { Formatters } from "./format";

/** Looks up a message; `t` from vue-i18n fits. */
export type Translate = (key: string, values?: Record<string, unknown>) => string;

/**
 * A window in words: "Tomorrow 13:00–15:00", or "Today 23:00 – tomorrow 01:00"
 * when it runs past midnight. `daySplit` is the slot at which tomorrow begins.
 */
export function describeWindow(
  timeline: Timeline,
  window: BestWindow,
  daySplit: number,
  format: Formatters,
  t: Translate,
): string {
  const start = timeline.starts[window.start]!;
  const end = timeline.starts[window.end - 1]! + timeline.step;
  const startsToday = window.start < daySplit;
  // A window that ends exactly at midnight still belongs to today.
  const endsToday = window.end <= daySplit;
  const times = { from: format.time(start), to: format.time(end) };

  if (startsToday === endsToday) {
    return t("window.sameDay", {
      day: t(startsToday ? "window.today" : "window.tomorrow"),
      ...times,
    });
  }
  return t("window.overnight", times);
}

export interface HourRow {
  /** Start of the hour, e.g. "13:00". */
  time: string;
  /** Mean of the hour's quarter hours that have a value, or `null` if none has. */
  value: number | null;
}

/** Hourly means of a day's quarter hours, for the table view of a chart. */
export function hourlyMeans(
  values: readonly (number | null)[],
  starts: readonly number[],
  format: Formatters,
  slotsPerHour = 4,
): HourRow[] {
  const rows: HourRow[] = [];
  for (let first = 0; first < starts.length; first += slotsPerHour) {
    const present = values
      .slice(first, first + slotsPerHour)
      .filter((value): value is number => value !== null && value !== undefined);
    rows.push({
      time: format.time(starts[first]!),
      value: present.length
        ? present.reduce((sum, value) => sum + value, 0) / present.length
        : null,
    });
  }
  return rows;
}
