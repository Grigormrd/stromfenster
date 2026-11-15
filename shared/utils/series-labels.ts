import type { SeriesId } from "./series.ts";

/** Names of the series for display. */
export const SERIES_LABELS: Record<SeriesId, string> = {
  price_day_ahead: "Day-ahead price",

  generation_biomass: "Biomass",
  generation_hydro: "Hydropower",
  generation_wind_offshore: "Wind offshore",
  generation_wind_onshore: "Wind onshore",
  generation_solar: "Solar",
  generation_other_renewables: "Other renewables",
  generation_lignite: "Lignite",
  generation_hard_coal: "Hard coal",
  generation_gas: "Natural gas",
  generation_pumped_storage: "Pumped storage",
  generation_other_conventional: "Other conventional",

  load: "Load",

  forecast_load: "Load forecast",
  forecast_wind_onshore: "Wind onshore forecast",
  forecast_wind_offshore: "Wind offshore forecast",
  forecast_solar: "Solar forecast",
};
