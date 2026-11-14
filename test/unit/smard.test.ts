import { describe, expect, it } from "vitest";
import { berlinDayRange, berlinDayStart } from "../../shared/utils/berlin-time.ts";
import { RESOLUTION_SECONDS, SERIES } from "../../shared/utils/series.ts";
import {
  fetchSmardWeek,
  parseSmardWeek,
  SmardFormatError,
  smardWeekUrl,
} from "../../worker/src/smard.ts";
import { readWeekFixture, recordedAt } from "../fixtures/smard.ts";

describe("smardWeekUrl", () => {
  it("builds the path SMARD uses, with the week start in milliseconds", () => {
    const url = smardWeekUrl(
      "https://www.smard.de/app/chart_data",
      SERIES.price_day_ahead,
      berlinDayStart("2026-11-09"),
    );

    expect(url).toBe(
      "https://www.smard.de/app/chart_data/4169/DE-LU/4169_DE-LU_quarterhour_1794178800000.json",
    );
  });
});

describe("parseSmardWeek with recorded responses", () => {
  const valuesOn = (values: { start: number }[], date: string) => {
    const { start, end } = berlinDayRange(date);
    return values.filter((value) => value.start >= start && value.start < end);
  };

  it("reads a complete week: 672 quarter hours, 15 minutes apart", () => {
    // The week in which the clocks went forward has one hour less.
    const week = parseSmardWeek(
      readWeekFixture("clock-changes", "price_day_ahead", berlinDayStart("2026-03-23")),
    );

    expect(week).toHaveLength(672 - 4);
    expect(week[0]?.start).toBe(berlinDayStart("2026-03-23"));
    for (let index = 1; index < week.length; index++) {
      expect(week[index]!.start - week[index - 1]!.start).toBe(RESOLUTION_SECONDS);
    }
  });

  it("finds 92 prices on the day the clocks went forward", () => {
    const week = parseSmardWeek(
      readWeekFixture("clock-changes", "price_day_ahead", berlinDayStart("2026-03-23")),
    );

    expect(valuesOn(week, "2026-03-29")).toHaveLength(92);
    expect(valuesOn(week, "2026-03-28")).toHaveLength(96);
  });

  it("finds 100 prices on the day the clocks went back", () => {
    const week = parseSmardWeek(
      readWeekFixture("clock-changes", "price_day_ahead", berlinDayStart("2026-10-19")),
    );

    expect(week).toHaveLength(672 + 4);
    expect(valuesOn(week, "2026-10-25")).toHaveLength(100);
  });

  it("drops quarter hours that have no value yet", () => {
    const recorded = recordedAt("snapshot-a");
    const json = readWeekFixture("snapshot-a", "generation_solar", berlinDayStart("2026-11-09"));
    const rows = (json as { series: [number, number | null][] }).series;

    const week = parseSmardWeek(json);

    expect(rows).toHaveLength(672);
    expect(week.length).toBe(rows.filter(([, value]) => value !== null).length);
    expect(week.length).toBeLessThan(672);
    // Generation is measured, so nothing recorded lies in the future.
    expect(week.at(-1)!.start).toBeLessThan(recorded);
  });

  it("keeps the values exactly as recorded", () => {
    const json = readWeekFixture("snapshot-a", "price_day_ahead", berlinDayStart("2026-11-09"));
    const [milliseconds, value] = (json as { series: [number, number][] }).series[0]!;

    expect(parseSmardWeek(json)[0]).toEqual({ start: milliseconds / 1000, value });
  });
});

describe("parseSmardWeek with malformed input", () => {
  it.each([
    ["no series", {}],
    ["series is not a list", { series: "nope" }],
    ["row is not a pair", { series: [[1794178800000]] }],
    ["timestamp off the grid", { series: [[1794178800001, 1]] }],
    [
      "timestamps not ascending",
      {
        series: [
          [1794179700000, 1],
          [1794178800000, 2],
        ],
      },
    ],
    ["value is a string", { series: [[1794178800000, "12.5"]] }],
    ["null document", null],
  ])("rejects %s", (_name, json) => {
    expect(() => parseSmardWeek(json)).toThrow(SmardFormatError);
  });
});

describe("fetchSmardWeek", () => {
  it("treats a week SMARD does not have yet as empty", async () => {
    const values = await fetchSmardWeek(
      async () => null,
      "https://example.invalid",
      SERIES.load,
      berlinDayStart("2026-11-16"),
    );

    expect(values).toEqual([]);
  });
});
