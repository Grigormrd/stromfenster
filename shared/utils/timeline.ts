import type { DayData } from "./day-data.ts";
import type { SeriesId } from "./series.ts";

/** The quarter hours of one or more consecutive days, laid end to end. */
export interface Timeline {
  /** Start of each quarter hour in epoch seconds. */
  starts: number[];
  /** Length of a slot in seconds. */
  step: number;
  /** Day-ahead price in ct/kWh. This is the wholesale price, without taxes, levies and grid fees. */
  price: (number | null)[];
  /**
   * Expected share of wind and solar in electricity use, from the forecasts:
   * 0.4 means 40 %. It can exceed 1 when more is generated than used.
   */
  windSolarShare: (number | null)[];
}

/** EUR/MWh, as the market quotes it, in the unit of an electricity bill. */
export function centsPerKwh(eurosPerMwh: number): number {
  return eurosPerMwh / 10;
}

function at(day: DayData, id: SeriesId, slot: number): number | null {
  return day.series[id][slot] ?? null;
}

/** Forecast wind and solar generation divided by the forecast load of a quarter hour. */
export function windSolarShare(day: DayData, slot: number): number | null {
  const load = at(day, "forecast_load", slot);
  const parts = [
    at(day, "forecast_wind_onshore", slot),
    at(day, "forecast_wind_offshore", slot),
    at(day, "forecast_solar", slot),
  ];
  if (load === null || load <= 0) return null;
  let sum = 0;
  for (const part of parts) {
    if (part === null) return null;
    sum += part;
  }
  return sum / load;
}

/** Joins days into one timeline. The days must be consecutive and in order. */
export function buildTimeline(days: readonly DayData[]): Timeline {
  const timeline: Timeline = { starts: [], step: 900, price: [], windSolarShare: [] };
  for (const day of days) {
    const dayStart = Date.parse(day.start) / 1000;
    timeline.step = day.resolutionMinutes * 60;
    for (let slot = 0; slot < day.slots; slot++) {
      const price = at(day, "price_day_ahead", slot);
      timeline.starts.push(dayStart + slot * timeline.step);
      timeline.price.push(price === null ? null : centsPerKwh(price));
      timeline.windSolarShare.push(windSolarShare(day, slot));
    }
  }
  return timeline;
}

/** Index of the slot that contains `now` (epoch seconds), or -1 if it lies outside the timeline. */
export function slotAt(timeline: Timeline, now: number): number {
  const first = timeline.starts[0];
  if (first === undefined || now < first) return -1;
  const index = timeline.starts.findLastIndex((start) => start <= now);
  const start = timeline.starts[index];
  return start !== undefined && now < start + timeline.step ? index : -1;
}
