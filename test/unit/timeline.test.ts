import { describe, expect, it } from "vitest";
import { berlinDayStart } from "../../shared/utils/berlin-time.ts";
import {
  generationMix,
  measuredSlots,
  MIX_GROUPS,
  renewableShare,
} from "../../shared/utils/mix.ts";
import { SERIES } from "../../shared/utils/series.ts";
import { buildTimeline, centsPerKwh, slotAt, windSolarShare } from "../../shared/utils/timeline.ts";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api.ts";

const today = readDayFixture("2026-11-14");
const tomorrow = readDayFixture("2026-11-15");
const yesterday = readDayFixture("2026-11-13");

describe("centsPerKwh", () => {
  it("converts the market's EUR/MWh", () => {
    expect(centsPerKwh(100)).toBe(10);
    expect(centsPerKwh(-12.5)).toBe(-1.25);
  });
});

describe("buildTimeline", () => {
  const timeline = buildTimeline([today, tomorrow]);

  it("lays two days end to end, a quarter hour apart", () => {
    expect(timeline.starts).toHaveLength(192);
    expect(timeline.starts[0]).toBe(berlinDayStart("2026-11-14"));
    expect(timeline.starts[96]).toBe(berlinDayStart("2026-11-15"));
    expect(
      timeline.starts.every(
        (start, index) => index === 0 || start - timeline.starts[index - 1]! === 900,
      ),
    ).toBe(true);
  });

  it("has every price of both days, in ct/kWh", () => {
    expect(timeline.price.every((price) => price !== null)).toBe(true);
    expect(timeline.price[0]).toBeCloseTo(today.series.price_day_ahead[0]! / 10);
    expect(timeline.price[96]).toBeCloseTo(tomorrow.series.price_day_ahead[0]! / 10);
  });

  it("has an expected wind and solar share for every quarter hour with forecasts", () => {
    expect(timeline.windSolarShare.every((share) => share !== null && share > 0 && share < 2)).toBe(
      true,
    );
  });
});

describe("windSolarShare", () => {
  it("is forecast wind and solar over forecast load", () => {
    const slot = 48;
    const series = today.series;
    const expected =
      (series.forecast_wind_onshore[slot]! +
        series.forecast_wind_offshore[slot]! +
        series.forecast_solar[slot]!) /
      series.forecast_load[slot]!;

    expect(windSolarShare(today, slot)).toBeCloseTo(expected, 12);
  });

  it("has no value when a forecast is missing", () => {
    const day = structuredClone(today);
    day.series.forecast_solar[10] = null;
    day.series.forecast_load[11] = null;

    expect(windSolarShare(day, 10)).toBeNull();
    expect(windSolarShare(day, 11)).toBeNull();
  });
});

describe("slotAt", () => {
  const timeline = buildTimeline([today, tomorrow]);

  it("finds the quarter hour that contains a moment", () => {
    const index = slotAt(timeline, API_RECORDED_AT);

    expect(timeline.starts[index]).toBe(Date.parse("2026-11-14T20:30:00Z") / 1000);
  });

  it("is -1 before and after the timeline", () => {
    expect(slotAt(timeline, timeline.starts[0]! - 1)).toBe(-1);
    expect(slotAt(timeline, timeline.starts.at(-1)! + 900)).toBe(-1);
    expect(slotAt(timeline, timeline.starts.at(-1)! + 899)).toBe(191);
  });
});

describe("generationMix", () => {
  it("covers every generation series exactly once", () => {
    const grouped = MIX_GROUPS.flatMap((group) => group.series).sort();
    const all = Object.entries(SERIES)
      .filter(([, series]) => series.kind === "generation")
      .map(([id]) => id)
      .sort();

    expect(grouped).toEqual(all);
  });

  it("adds a group's series and converts MWh per quarter hour to GW", () => {
    const mix = generationMix(yesterday);
    const slot = 50;
    const wind =
      yesterday.series.generation_wind_onshore[slot]! +
      yesterday.series.generation_wind_offshore[slot]!;

    // 1 MWh in a quarter of an hour is 4 MW.
    expect(mix.wind[slot]).toBeCloseTo((wind * 4) / 1000, 9);
    expect(mix.solar[slot]).toBeCloseTo((yesterday.series.generation_solar[slot]! * 4) / 1000, 9);
  });

  it("knows where the measured values of an unfinished day end", () => {
    expect(measuredSlots(generationMix(yesterday))).toBe(96);
    expect(measuredSlots(generationMix(tomorrow))).toBe(0);

    const measured = measuredSlots(generationMix(today));
    expect(measured).toBeGreaterThan(70);
    expect(measured).toBeLessThan(96);
  });

  it("gives the renewable share of a quarter hour", () => {
    const mix = generationMix(yesterday);
    const total = MIX_GROUPS.reduce((sum, group) => sum + mix[group.id][40]!, 0);
    const renewable = mix.other_renewables[40]! + mix.wind[40]! + mix.solar[40]!;

    expect(renewableShare(mix, 40)).toBeCloseTo(renewable / total, 12);
    expect(renewableShare(generationMix(tomorrow), 40)).toBeNull();
  });
});
