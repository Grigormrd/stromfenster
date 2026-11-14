import { berlinDayRange, slotStarts } from "../../shared/utils/berlin-time.ts";
import type { Point, SeriesId } from "../../shared/utils/series.ts";
import { RESOLUTION_SECONDS, SERIES_IDS } from "../../shared/utils/series.ts";

export interface DayData {
  /** Calendar date in Berlin, YYYY-MM-DD. */
  date: string;
  timezone: "Europe/Berlin";
  /** First and next midnight in Berlin, as ISO 8601 in UTC. */
  start: string;
  end: string;
  resolutionMinutes: number;
  /** Quarter hours in this day: 96, or 92 and 100 when the clocks change. */
  slots: number;
  /** One value per quarter hour and series; `null` where there is no value (yet). */
  series: Record<SeriesId, (number | null)[]>;
  source: { name: string; url: string; license: string };
}

export const SOURCE = {
  name: "Bundesnetzagentur | SMARD.de",
  url: "https://www.smard.de",
  license: "CC BY 4.0",
} as const;

/** Lays the points of one Berlin day out on its quarter-hour grid. */
export function buildDay(date: string, points: readonly Point[]): DayData {
  const range = berlinDayRange(date);
  const slots = slotStarts(range, RESOLUTION_SECONDS).length;

  const series = {} as DayData["series"];
  for (const id of SERIES_IDS) series[id] = new Array<number | null>(slots).fill(null);

  for (const point of points) {
    if (point.start < range.start || point.start >= range.end) continue;
    const values = series[point.series];
    if (values) values[(point.start - range.start) / RESOLUTION_SECONDS] = point.value;
  }

  return {
    date,
    timezone: "Europe/Berlin",
    start: new Date(range.start * 1000).toISOString(),
    end: new Date(range.end * 1000).toISOString(),
    resolutionMinutes: RESOLUTION_SECONDS / 60,
    slots,
    series,
    source: SOURCE,
  };
}
