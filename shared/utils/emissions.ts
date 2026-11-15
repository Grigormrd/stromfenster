import type { DayData } from "./day-data.ts";
import type { SeriesId } from "./series.ts";

/** Where the emission factors come from. Shown on the methodology page. */
export const EMISSION_SOURCE = {
  publisher: "Umweltbundesamt",
  title:
    "Entwicklung der spezifischen Treibhausgas-Emissionen des deutschen Strommix in den Jahren 1990 - 2024",
  series: "Climate Change 13/2025",
  table: "Table 4",
  year: 2024,
  url: "https://www.umweltbundesamt.de/publikationen/entwicklung-der-spezifischen-treibhausgas-11",
  /**
   * The same report's figure for the whole German electricity mix in 2024
   * (Table 3, estimated), direct CO₂ in g/kWh. Shown for comparison only.
   */
  germanMix2024: 363,
} as const;

export type GenerationSeriesId = Extract<SeriesId, `generation_${string}`>;

export interface EmissionFactor {
  /** Direct CO₂ emissions in grams per kWh of electricity. */
  gramsPerKwh: number;
  /**
   * `published`: the value is in the source. `stand-in`: the source has no
   * value for this series and another one is used. `zero`: counted as zero,
   * for the reason given in `note`.
   */
  basis: "published" | "stand-in" | "zero";
  note: string;
}

/**
 * Direct CO₂ emissions per kWh of electricity, by generation series.
 *
 * The three published values are for German power plants in 2024
 * (preliminary). They cover the combustion in the plant only: no extraction
 * or transport of fuel, no construction, no other greenhouse gases.
 */
export const EMISSION_FACTORS: Record<GenerationSeriesId, EmissionFactor> = {
  generation_lignite: { gramsPerKwh: 1119, basis: "published", note: "Lignite" },
  generation_hard_coal: { gramsPerKwh: 860, basis: "published", note: "Hard coal" },
  generation_gas: { gramsPerKwh: 392, basis: "published", note: "Natural gas" },
  generation_other_conventional: {
    gramsPerKwh: 860,
    basis: "stand-in",
    note: "Mineral oil, waste, gases from coal and steel production, and other fuels. The source has no value for this group; the hard coal value is used in its place.",
  },
  generation_pumped_storage: {
    gramsPerKwh: 0,
    basis: "zero",
    note: "The electricity was generated, and counted, when the water was pumped up.",
  },
  generation_biomass: {
    gramsPerKwh: 0,
    basis: "zero",
    note: "The source counts no CO₂ for renewable fuels.",
  },
  generation_hydro: { gramsPerKwh: 0, basis: "zero", note: "No combustion." },
  generation_wind_onshore: { gramsPerKwh: 0, basis: "zero", note: "No combustion." },
  generation_wind_offshore: { gramsPerKwh: 0, basis: "zero", note: "No combustion." },
  generation_solar: { gramsPerKwh: 0, basis: "zero", note: "No combustion." },
  generation_other_renewables: {
    gramsPerKwh: 0,
    basis: "zero",
    note: "The source counts no CO₂ for renewable fuels.",
  },
};

const GENERATION_IDS = Object.keys(EMISSION_FACTORS) as GenerationSeriesId[];

/** Emissions in grams and generation in MWh of one quarter hour, or `null` if a series has no value. */
function slotTotals(day: DayData, slot: number): { grams: number; megawattHours: number } | null {
  let grams = 0;
  let megawattHours = 0;
  for (const id of GENERATION_IDS) {
    const generated = day.series[id][slot];
    if (generated === null || generated === undefined) return null;
    megawattHours += generated;
    // MWh times g/kWh is kilograms; the unit cancels in the ratio below.
    grams += generated * EMISSION_FACTORS[id].gramsPerKwh;
  }
  return { grams, megawattHours };
}

/**
 * Estimated direct CO₂ emissions per kWh generated in one quarter hour, in
 * g/kWh: the emissions of all sources divided by all generation. `null` when
 * the quarter hour has not been measured yet.
 *
 * It describes generation in Germany. Imports and exports are not part of it.
 */
export function co2Intensity(day: DayData, slot: number): number | null {
  const totals = slotTotals(day, slot);
  if (!totals || totals.megawattHours <= 0) return null;
  return totals.grams / totals.megawattHours;
}

/** The intensity of every quarter hour of a day. */
export function co2IntensitySeries(day: DayData): (number | null)[] {
  return Array.from({ length: day.slots }, (_unused, slot) => co2Intensity(day, slot));
}

/**
 * The intensity over a stretch of quarter hours (`from` inclusive, `to`
 * exclusive): all emissions divided by all generation, so an hour with much
 * generation weighs more than one with little. Quarter hours without
 * measurements are left out; `null` if none is measured.
 */
export function meanCo2Intensity(day: DayData, from = 0, to = day.slots): number | null {
  let grams = 0;
  let megawattHours = 0;
  for (let slot = Math.max(0, from); slot < Math.min(to, day.slots); slot++) {
    const totals = slotTotals(day, slot);
    if (!totals) continue;
    grams += totals.grams;
    megawattHours += totals.megawattHours;
  }
  return megawattHours > 0 ? grams / megawattHours : null;
}
