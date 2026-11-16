import type { DayData } from "./day-data.ts";
import { co2IntensitySeries, meanCo2Intensity } from "./emissions.ts";
import type { Mix } from "./mix.ts";
import { generationMix, measuredSlots, MIX_GROUPS } from "./mix.ts";
import { centsPerKwh } from "./timeline.ts";

export interface PricePoint {
  /** ct/kWh */
  value: number;
  /** Index of the quarter hour. */
  slot: number;
}

/** Everything a day page shows, for one calendar day in Berlin. */
export interface DaySummary {
  date: string;
  /** Start of each quarter hour, epoch seconds. */
  starts: number[];
  /** Day-ahead price per quarter hour in ct/kWh. */
  price: (number | null)[];
  prices: { average: number; lowest: PricePoint; highest: PricePoint } | null;
  /** Measured generation in GW, and how many quarter hours of it exist. */
  mix: Mix;
  mixSlots: number;
  co2: { series: (number | null)[]; mean: number | null };
  /** Share of renewables in the day's measured generation, weighted by energy, 0 to 1. */
  renewableShare: number | null;
  /** False when the API has no value at all for this day. */
  hasData: boolean;
}

/** Share of the renewable groups in the energy of the first `slots` quarter hours. */
export function renewableShareOfDay(mix: Mix, slots: number): number | null {
  let renewable = 0;
  let total = 0;
  for (let slot = 0; slot < slots; slot++) {
    for (const group of MIX_GROUPS) {
      const value = mix[group.id][slot];
      if (value === null || value === undefined) continue;
      total += value;
      if (group.renewable) renewable += value;
    }
  }
  return total > 0 ? renewable / total : null;
}

export function summariseDay(day: DayData): DaySummary {
  const dayStart = Date.parse(day.start) / 1000;
  const step = day.resolutionMinutes * 60;
  const starts = Array.from({ length: day.slots }, (_unused, slot) => dayStart + slot * step);
  const price = day.series.price_day_ahead.map((value) =>
    value === null ? null : centsPerKwh(value),
  );

  let prices: DaySummary["prices"] = null;
  const known = price
    .map((value, slot) => ({ value, slot }))
    .filter((point): point is PricePoint => point.value !== null);
  if (known.length > 0) {
    // Of equal prices, the earliest quarter hour is named.
    const lowest = known.reduce((best, point) => (point.value < best.value ? point : best));
    const highest = known.reduce((best, point) => (point.value > best.value ? point : best));
    const average = known.reduce((sum, point) => sum + point.value, 0) / known.length;
    prices = { average, lowest, highest };
  }

  const mix = generationMix(day);
  const mixSlots = measuredSlots(mix);
  const hasData = Object.values(day.series).some((values) =>
    values.some((value) => value !== null),
  );

  return {
    date: day.date,
    starts,
    price,
    prices,
    mix,
    mixSlots,
    co2: { series: co2IntensitySeries(day), mean: meanCo2Intensity(day) },
    renewableShare: renewableShareOfDay(mix, mixSlots),
    hasData,
  };
}
