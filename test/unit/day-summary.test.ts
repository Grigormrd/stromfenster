import { describe, expect, it } from "vitest";
import { berlinDayStart } from "../../shared/utils/berlin-time.ts";
import { renewableShareOfDay, summariseDay } from "../../shared/utils/day-summary.ts";
import { meanCo2Intensity } from "../../shared/utils/emissions.ts";
import { generationMix, MIX_GROUPS } from "../../shared/utils/mix.ts";
import { FIRST_FULL_DAY } from "../../shared/utils/site.ts";
import { sitemapPages, sitemapXml } from "../../server/utils/sitemap.ts";
import { readDayFixture } from "../fixtures/api.ts";

const complete = readDayFixture("2026-11-13");
const unfinished = readDayFixture("2026-11-14");
const ahead = readDayFixture("2026-11-15");

describe("summariseDay", () => {
  it("lays the day out on its quarter hours, prices in ct/kWh", () => {
    const summary = summariseDay(complete);

    expect(summary.starts).toHaveLength(96);
    expect(summary.starts[0]).toBe(berlinDayStart("2026-11-13"));
    expect(summary.price[0]).toBeCloseTo(complete.series.price_day_ahead[0]! / 10, 9);
    expect(summary.hasData).toBe(true);
  });

  it("finds the lowest and highest price and when they were", () => {
    const { prices, price } = summariseDay(complete);
    const values = price as number[];

    expect(prices!.lowest.value).toBe(Math.min(...values));
    expect(prices!.highest.value).toBe(Math.max(...values));
    expect(price[prices!.lowest.slot]).toBe(prices!.lowest.value);
    expect(price[prices!.highest.slot]).toBe(prices!.highest.value);
    expect(prices!.average).toBeCloseTo(values.reduce((a, b) => a + b, 0) / values.length, 9);
  });

  it("takes the CO₂ mean over the measured part of the day", () => {
    const summary = summariseDay(complete);

    expect(summary.co2.mean).toBeCloseTo(meanCo2Intensity(complete)!, 9);
    expect(Math.round(summary.co2.mean!)).toBe(258);
    expect(summary.mixSlots).toBe(96);
  });

  it("knows a day that is not over yet, and one with forecasts only", () => {
    expect(summariseDay(unfinished).mixSlots).toBeLessThan(96);
    const tomorrow = summariseDay(ahead);

    expect(tomorrow.mixSlots).toBe(0);
    expect(tomorrow.co2.mean).toBeNull();
    expect(tomorrow.renewableShare).toBeNull();
    expect(tomorrow.prices).not.toBeNull();
    expect(tomorrow.hasData).toBe(true);
  });

  it("has no data for a day the API knows nothing about", () => {
    const empty = structuredClone(ahead);
    for (const values of Object.values(empty.series)) values.fill(null);

    const summary = summariseDay(empty);

    expect(summary.hasData).toBe(false);
    expect(summary.prices).toBeNull();
  });
});

describe("renewableShareOfDay", () => {
  it("weighs the quarter hours by their generation", () => {
    const mix = generationMix(complete);
    let renewable = 0;
    let total = 0;
    for (let slot = 0; slot < 96; slot++) {
      for (const group of MIX_GROUPS) {
        total += mix[group.id][slot]!;
        if (group.renewable) renewable += mix[group.id][slot]!;
      }
    }

    expect(renewableShareOfDay(mix, 96)).toBeCloseTo(renewable / total, 12);
    expect(renewableShareOfDay(mix, 0)).toBeNull();
  });
});

describe("sitemap", () => {
  it("lists the start page, the methodology and every complete day, newest first", () => {
    const pages = sitemapPages("2026-11-15");

    expect(pages.slice(0, 2)).toEqual([
      { de: "/", en: "/en" },
      { de: "/methodik", en: "/en/methodology" },
    ]);
    expect(pages.slice(2).map((page) => page.de)).toEqual([
      "/tag/2026-11-15",
      "/tag/2026-11-14",
      `/tag/${FIRST_FULL_DAY}`,
    ]);
    expect(pages.at(-1)!.en).toBe(`/en/day/${FIRST_FULL_DAY}`);
  });

  it("has no day pages before the first complete day", () => {
    expect(sitemapPages("2026-11-12")).toHaveLength(2);
  });

  it("names both languages for every address", () => {
    const xml = sitemapXml(sitemapPages("2026-11-13"));

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml.match(/<url>/g)).toHaveLength(6);
    expect(xml).toContain("<loc>https://stromfenster.vercel.app</loc>");
    expect(xml).toContain("<loc>https://stromfenster.vercel.app/en/day/2026-11-13</loc>");
    expect(
      xml.match(/hreflang="de-DE" href="https:\/\/stromfenster.vercel.app\/tag\/2026-11-13"/g),
    ).toHaveLength(2);
    expect(xml.match(/hreflang="x-default"/g)).toHaveLength(6);
  });
});
