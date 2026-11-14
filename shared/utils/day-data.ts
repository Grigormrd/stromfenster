import type { SeriesId } from "./series.ts";

/** One calendar day in Berlin as the pipeline's API returns it (`/api/days/YYYY-MM-DD`). */
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
