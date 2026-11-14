import type { DayData } from "./day-data.ts";
import type { SeriesId } from "./series.ts";

export interface MixGroup {
  id: "other" | "coal" | "gas" | "other_renewables" | "wind" | "solar";
  label: string;
  series: readonly SeriesId[];
  renewable: boolean;
}

/**
 * The generation series folded into six groups, in the order they are stacked
 * (bottom first). Eleven series are more than a chart can tell apart; the
 * table next to it lists the groups with their values.
 */
export const MIX_GROUPS: readonly MixGroup[] = [
  {
    id: "other",
    label: "Other",
    series: ["generation_pumped_storage", "generation_other_conventional"],
    renewable: false,
  },
  {
    id: "coal",
    label: "Coal",
    series: ["generation_lignite", "generation_hard_coal"],
    renewable: false,
  },
  { id: "gas", label: "Gas", series: ["generation_gas"], renewable: false },
  {
    id: "other_renewables",
    label: "Biomass and hydro",
    series: ["generation_biomass", "generation_hydro", "generation_other_renewables"],
    renewable: true,
  },
  {
    id: "wind",
    label: "Wind",
    series: ["generation_wind_onshore", "generation_wind_offshore"],
    renewable: true,
  },
  { id: "solar", label: "Solar", series: ["generation_solar"], renewable: true },
];

export type Mix = Record<MixGroup["id"], (number | null)[]>;

/** MWh per quarter hour, as the series are stored, as average power in GW. */
function gigawatts(megawattHours: number, slotMinutes: number): number {
  return (megawattHours * (60 / slotMinutes)) / 1000;
}

/**
 * Average power per group and quarter hour in GW. A quarter hour without a
 * value for one of a group's series has no value for the group.
 */
export function generationMix(day: DayData): Mix {
  const mix = {} as Mix;
  for (const group of MIX_GROUPS) {
    mix[group.id] = Array.from({ length: day.slots }, (_unused, slot) => {
      let sum = 0;
      for (const id of group.series) {
        const value = day.series[id][slot];
        if (value === null || value === undefined) return null;
        sum += value;
      }
      return gigawatts(sum, day.resolutionMinutes);
    });
  }
  return mix;
}

/** Index after the last quarter hour for which every group has a value. */
export function measuredSlots(mix: Mix): number {
  let count = Infinity;
  for (const group of MIX_GROUPS) {
    const last = mix[group.id].findLastIndex((value) => value !== null);
    count = Math.min(count, last + 1);
  }
  return Number.isFinite(count) ? count : 0;
}

/** Share of the renewable groups in total generation for one quarter hour, 0 to 1. */
export function renewableShare(mix: Mix, slot: number): number | null {
  let renewable = 0;
  let total = 0;
  for (const group of MIX_GROUPS) {
    const value = mix[group.id][slot];
    if (value === null || value === undefined) return null;
    total += value;
    if (group.renewable) renewable += value;
  }
  return total > 0 ? renewable / total : null;
}
