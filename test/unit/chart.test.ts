import { describe, expect, it } from "vitest";
import { linearScale, niceTicks, stepArea, stepBand, stepLine } from "../../app/utils/chart.ts";
import { formattersFor } from "../../app/utils/format.ts";

describe("linearScale", () => {
  it("maps the domain onto the range", () => {
    const scale = linearScale([0, 10], [100, 200]);

    expect(scale(0)).toBe(100);
    expect(scale(5)).toBe(150);
    expect(scale(10)).toBe(200);
  });

  it("can run downwards, as a y axis does", () => {
    const scale = linearScale([0, 30], [240, 40]);

    expect(scale(0)).toBe(240);
    expect(scale(30)).toBe(40);
  });

  it("does not divide by zero for an empty domain", () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0);
  });
});

describe("niceTicks", () => {
  it("encloses the data with round steps", () => {
    expect(niceTicks(0, 26.7, 4)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(0, 0.8, 4)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
    expect(niceTicks(0, 74, 4)).toEqual([0, 20, 40, 60, 80]);
  });

  it("extends below zero for negative prices", () => {
    const ticks = niceTicks(-3.2, 14, 4);

    expect(ticks[0]).toBeLessThanOrEqual(-3.2);
    expect(ticks).toContain(0);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(14);
  });

  it("has no floating-point noise in its values", () => {
    for (const tick of niceTicks(0, 0.63, 4)) {
      expect(String(tick).length).toBeLessThanOrEqual(4);
    }
  });

  it("still gives an axis for a flat or empty series", () => {
    expect(niceTicks(5, 5).length).toBeGreaterThan(1);
    expect(niceTicks(Infinity, -Infinity)).toEqual([0, 1]);
  });
});

describe("step paths", () => {
  const x = (index: number) => index * 10;
  const y = (value: number) => 100 - value;

  it("holds each value for the width of its slot", () => {
    expect(stepLine([10, 20, 20], x, y)).toBe("M0,90H10V80H20V80H30");
  });

  it("does not draw across a gap", () => {
    expect(stepLine([10, null, 30], x, y)).toBe("M0,90H10M20,70H30");
  });

  it("closes the area under each run down to the baseline", () => {
    expect(stepArea([10, null, 30], x, y, 100)).toBe("M0,100V90H10V100H0ZM20,100V70H30V100H20Z");
  });

  it("draws a stacked band between its lower and upper edge", () => {
    expect(stepBand([10, 10], [30, 40], x, y)).toBe("M0,70H10V60H20V90H10V90H0Z");
  });

  it("draws nothing for an empty series", () => {
    expect(stepLine([], x, y)).toBe("");
    expect(stepBand([], [], x, y)).toBe("");
  });
});

describe("formatting", () => {
  const seconds = (iso: string) => Date.parse(iso) / 1000;
  const en = formattersFor("en-GB");
  const de = formattersFor("de-DE");

  it("shows times in Berlin, in winter and in summer, in both languages", () => {
    for (const format of [en, de]) {
      expect(format.time(seconds("2026-11-14T20:30:00Z"))).toBe("21:30");
      expect(format.time(seconds("2026-07-01T20:30:00Z"))).toBe("22:30");
      expect(format.time(seconds("2026-11-14T23:00:00Z"))).toBe("00:00");
    }
  });

  it("names the day in Berlin, not in UTC", () => {
    const lateEvening = seconds("2026-11-14T23:30:00Z");

    expect(en.weekday(lateEvening)).toBe("Sunday");
    expect(en.dayMonth(lateEvening)).toBe("15 November");
    expect(de.weekday(lateEvening)).toBe("Sonntag");
    expect(de.dayMonth(lateEvening)).toBe("15. November");
  });

  it("uses each language's decimal and thousands separators", () => {
    expect(en.price(9.94)).toBe("9.9 ct/kWh");
    expect(de.price(9.94)).toBe("9,9 ct/kWh");
    expect(en.price(-1.25)).toBe("-1.3 ct/kWh");
    expect(de.price(-1.25)).toBe("-1,3 ct/kWh");
    expect(en.grams(1119)).toBe("1,119 g/kWh");
    expect(de.grams(1119)).toBe("1.119 g/kWh");
    expect(en.share(0.766)).toBe("77 %");
    expect(de.share(0.766)).toBe("77 %");
  });

  it("creates the formatters of a language once", () => {
    expect(formattersFor("de-DE")).toBe(de);
  });
});
