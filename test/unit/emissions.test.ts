import { describe, expect, it } from "vitest";
import {
  co2Intensity,
  co2IntensitySeries,
  EMISSION_FACTORS,
  EMISSION_SOURCE,
  meanCo2Intensity,
} from "../../shared/utils/emissions.ts";
import { MIX_GROUPS } from "../../shared/utils/mix.ts";
import { SERIES, SERIES_IDS } from "../../shared/utils/series.ts";
import { readDayFixture } from "../fixtures/api.ts";

const yesterday = readDayFixture("2026-11-13");
const today = readDayFixture("2026-11-14");
const tomorrow = readDayFixture("2026-11-15");

describe("emission factors", () => {
  it("has a factor for every generation series, and for nothing else", () => {
    const generation = SERIES_IDS.filter((id) => SERIES[id].kind === "generation").sort();

    expect(Object.keys(EMISSION_FACTORS).sort()).toEqual(generation);
  });

  it("uses the three values published by the Umweltbundesamt for 2024", () => {
    // Climate Change 13/2025, Table 4: CO₂ per kWh of electricity.
    expect(EMISSION_FACTORS.generation_gas).toMatchObject({ gramsPerKwh: 392, basis: "published" });
    expect(EMISSION_FACTORS.generation_hard_coal).toMatchObject({
      gramsPerKwh: 860,
      basis: "published",
    });
    expect(EMISSION_FACTORS.generation_lignite).toMatchObject({
      gramsPerKwh: 1119,
      basis: "published",
    });
    expect(EMISSION_SOURCE.year).toBe(2024);
  });

  it("marks the one value the source does not have as a stand-in", () => {
    const standIns = Object.entries(EMISSION_FACTORS).filter(
      ([, factor]) => factor.basis === "stand-in",
    );

    expect(standIns.map(([id]) => id)).toEqual(["generation_other_conventional"]);
    expect(EMISSION_FACTORS.generation_other_conventional.gramsPerKwh).toBe(
      EMISSION_FACTORS.generation_hard_coal.gramsPerKwh,
    );
  });

  it("counts nothing for the renewable groups of the generation chart", () => {
    for (const group of MIX_GROUPS.filter((group) => group.renewable)) {
      for (const id of group.series) {
        expect(EMISSION_FACTORS[id as keyof typeof EMISSION_FACTORS].gramsPerKwh).toBe(0);
      }
    }
  });
});

describe("co2Intensity", () => {
  it("divides the emissions of all sources by all generation", () => {
    const day = structuredClone(yesterday);
    const slot = 0;
    for (const id of Object.keys(EMISSION_FACTORS) as (keyof typeof EMISSION_FACTORS)[]) {
      day.series[id][slot] = 0;
    }
    // 100 MWh from lignite, 100 from gas, 300 from wind.
    day.series.generation_lignite[slot] = 100;
    day.series.generation_gas[slot] = 100;
    day.series.generation_wind_onshore[slot] = 300;

    expect(co2Intensity(day, slot)).toBeCloseTo((100 * 1119 + 100 * 392) / 500, 9);
  });

  it("is zero when only renewables run", () => {
    const day = structuredClone(yesterday);
    for (const id of Object.keys(EMISSION_FACTORS) as (keyof typeof EMISSION_FACTORS)[]) {
      day.series[id][5] = 0;
    }
    day.series.generation_solar[5] = 250;

    expect(co2Intensity(day, 5)).toBe(0);
  });

  it("has no value for a quarter hour that is not measured yet", () => {
    expect(co2Intensity(tomorrow, 10)).toBeNull();

    const day = structuredClone(yesterday);
    day.series.generation_gas[20] = null;
    expect(co2Intensity(day, 20)).toBeNull();
  });

  it("stays between zero and the lignite factor on a recorded day", () => {
    const series = co2IntensitySeries(yesterday);

    expect(series).toHaveLength(96);
    for (const value of series) {
      expect(value).not.toBeNull();
      expect(value!).toBeGreaterThan(0);
      expect(value!).toBeLessThan(1119);
    }
  });
});

describe("meanCo2Intensity", () => {
  it("is 258 g/kWh for 13 November 2026, the value worked out when the source was chosen", () => {
    expect(Math.round(meanCo2Intensity(yesterday)!)).toBe(258);
  });

  it("weighs quarter hours by how much was generated in them", () => {
    const day = structuredClone(yesterday);
    for (const id of Object.keys(EMISSION_FACTORS) as (keyof typeof EMISSION_FACTORS)[]) {
      day.series[id][0] = 0;
      day.series[id][1] = 0;
    }
    // A small, dirty quarter hour and a large, clean one.
    day.series.generation_lignite[0] = 100;
    day.series.generation_wind_onshore[1] = 900;

    expect(co2Intensity(day, 0)).toBe(1119);
    expect(co2Intensity(day, 1)).toBe(0);
    expect(meanCo2Intensity(day, 0, 2)).toBeCloseTo(111.9, 9);
  });

  it("covers only the measured part of an unfinished day", () => {
    const measured = co2IntensitySeries(today).findLastIndex((value) => value !== null) + 1;

    expect(measured).toBeGreaterThan(70);
    expect(meanCo2Intensity(today)).toBeCloseTo(meanCo2Intensity(today, 0, measured)!, 9);
    expect(meanCo2Intensity(tomorrow)).toBeNull();
  });
});
