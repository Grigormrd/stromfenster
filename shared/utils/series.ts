/** All series share one grid: a value per quarter hour. */
export const RESOLUTION_SECONDS = 900;

export interface SeriesDefinition {
  /** Id of the series on SMARD ("filter" in its URLs). */
  filter: number;
  /** Germany, or the German-Luxembourg bidding zone for prices. */
  region: "DE" | "DE-LU";
  /** Energy values are MWh per quarter hour, as SMARD delivers them. */
  unit: "EUR/MWh" | "MWh";
  kind: "price" | "generation" | "load" | "forecast";
}

/**
 * The series the app imports. Keys are our own ids, used in the database and
 * the API. Nuclear (SMARD filter 1224) is left out: it has had no values since
 * the last plants shut down.
 */
export const SERIES = {
  price_day_ahead: { filter: 4169, region: "DE-LU", unit: "EUR/MWh", kind: "price" },

  generation_biomass: { filter: 4066, region: "DE", unit: "MWh", kind: "generation" },
  generation_hydro: { filter: 1226, region: "DE", unit: "MWh", kind: "generation" },
  generation_wind_offshore: { filter: 1225, region: "DE", unit: "MWh", kind: "generation" },
  generation_wind_onshore: { filter: 4067, region: "DE", unit: "MWh", kind: "generation" },
  generation_solar: { filter: 4068, region: "DE", unit: "MWh", kind: "generation" },
  generation_other_renewables: { filter: 1228, region: "DE", unit: "MWh", kind: "generation" },
  generation_lignite: { filter: 1223, region: "DE", unit: "MWh", kind: "generation" },
  generation_hard_coal: { filter: 4069, region: "DE", unit: "MWh", kind: "generation" },
  generation_gas: { filter: 4071, region: "DE", unit: "MWh", kind: "generation" },
  generation_pumped_storage: { filter: 4070, region: "DE", unit: "MWh", kind: "generation" },
  generation_other_conventional: { filter: 1227, region: "DE", unit: "MWh", kind: "generation" },

  load: { filter: 410, region: "DE", unit: "MWh", kind: "load" },

  forecast_load: { filter: 411, region: "DE", unit: "MWh", kind: "forecast" },
  forecast_wind_onshore: { filter: 123, region: "DE", unit: "MWh", kind: "forecast" },
  forecast_wind_offshore: { filter: 3791, region: "DE", unit: "MWh", kind: "forecast" },
  forecast_solar: { filter: 125, region: "DE", unit: "MWh", kind: "forecast" },
} as const satisfies Record<string, SeriesDefinition>;

export type SeriesId = keyof typeof SERIES;

export const SERIES_IDS = Object.keys(SERIES) as SeriesId[];

/** One value of one series. `start` is the start of its quarter hour in epoch seconds (UTC). */
export interface Point {
  series: SeriesId;
  start: number;
  value: number;
}
