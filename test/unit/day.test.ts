import { describe, expect, it } from "vitest";
import { berlinDayStart } from "../../shared/utils/berlin-time.ts";
import { SERIES_IDS } from "../../shared/utils/series.ts";
import { buildDay } from "../../server/utils/day.ts";

describe("buildDay", () => {
  const start = berlinDayStart("2026-11-14");

  it("puts each value into the slot of its quarter hour", () => {
    const day = buildDay("2026-11-14", [
      { series: "price_day_ahead", start, value: 90.5 },
      { series: "price_day_ahead", start: start + 900, value: 88 },
      { series: "load", start: start + 95 * 900, value: 11_000 },
    ]);

    expect(day.series.price_day_ahead.slice(0, 3)).toEqual([90.5, 88, null]);
    expect(day.series.load[95]).toBe(11_000);
    expect(day.series.load.slice(0, 95).every((value) => value === null)).toBe(true);
  });

  it("has a full grid for every series, also without values", () => {
    const day = buildDay("2026-11-14", []);

    expect(Object.keys(day.series)).toEqual(SERIES_IDS);
    for (const id of SERIES_IDS) expect(day.series[id]).toHaveLength(96);
  });

  it("ignores values from other days", () => {
    const day = buildDay("2026-11-14", [
      { series: "load", start: start - 900, value: 1 },
      { series: "load", start: start + 96 * 900, value: 2 },
    ]);

    expect(day.series.load.every((value) => value === null)).toBe(true);
  });

  it("describes the day in Berlin time", () => {
    expect(buildDay("2026-10-25", [])).toMatchObject({
      date: "2026-10-25",
      timezone: "Europe/Berlin",
      start: "2026-10-24T22:00:00.000Z",
      end: "2026-10-25T23:00:00.000Z",
      resolutionMinutes: 15,
      slots: 100,
    });
  });

  it("keeps both 02:00 hours apart when the clocks go back", () => {
    // 02:00 summer time and 02:00 winter time are one hour apart in UTC.
    const firstTwoOClock = Date.parse("2026-10-25T00:00:00Z") / 1000;
    const secondTwoOClock = Date.parse("2026-10-25T01:00:00Z") / 1000;

    const day = buildDay("2026-10-25", [
      { series: "load", start: firstTwoOClock, value: 1 },
      { series: "load", start: secondTwoOClock, value: 2 },
    ]);

    expect(day.series.load[8]).toBe(1);
    expect(day.series.load[12]).toBe(2);
  });
});
