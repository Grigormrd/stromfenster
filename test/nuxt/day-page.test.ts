import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import DayPage from "~/pages/day/[date].vue";
import { readDayFixture } from "../fixtures/api";

// Rendered on the evening of 14 November 2026 (see vitest.config.ts): the
// 13th is a complete past day, the 15th is tomorrow.
registerEndpoint("/api/days/2026-11-13", () => readDayFixture("2026-11-13"));
registerEndpoint("/api/days/2026-11-15", () => readDayFixture("2026-11-15"));

const summary = summariseDay(readDayFixture("2026-11-13"));

describe("day page", () => {
  it("names the day in German at /tag/…", async () => {
    const page = await mountSuspended(DayPage, { route: "/tag/2026-11-13" });

    expect(page.find("h1").text()).toBe("Strom am Freitag, 13. November 2026");
  });

  it("shows the prices of the day and when they were lowest and highest", async () => {
    const page = await mountSuspended(DayPage, { route: "/tag/2026-11-13" });
    const de = formattersFor("de-DE");
    const figures = page.findAll(".figures > div").map((figure) => ({
      label: figure.find("dt").text(),
      value: figure.find("dd").text(),
    }));

    expect(figures.map((figure) => figure.label)).toEqual([
      "Preis im Mittel",
      "Niedrigster Preis",
      "Höchster Preis",
      "CO₂ je kWh, Tagesmittel",
      "Erneuerbare, Anteil am Tag",
    ]);
    expect(figures[1]!.value).toBe(de.price(summary.prices!.lowest.value));
    expect(figures[2]!.value).toBe(de.price(summary.prices!.highest.value));
    expect(figures[3]!.value).toBe("258 g/kWh");
  });

  it("draws the price and the generation, each with a table", async () => {
    const page = await mountSuspended(DayPage, { route: "/tag/2026-11-13" });

    expect(page.findAll('svg[role="img"]')).toHaveLength(4);
    expect(page.findAll("figure h2").map((title) => title.text())).toEqual(["Preis", "Erzeugung"]);
    expect(page.findAll("details table")[0]!.findAll("tbody tr")).toHaveLength(24);
    expect(page.find("text.day").text()).toBe("Freitag");
  });

  it("links to the day before and the day after", async () => {
    const page = await mountSuspended(DayPage, { route: "/tag/2026-11-13" });

    expect(page.find('nav a[rel="prev"]').attributes("href")).toBe("/tag/2026-11-12");
    expect(page.find('nav a[rel="next"]').attributes("href")).toBe("/tag/2026-11-14");
  });

  it("has no link beyond tomorrow, and no measured generation for tomorrow", async () => {
    const page = await mountSuspended(DayPage, { route: "/tag/2026-11-15" });

    expect(page.find('nav a[rel="next"]').exists()).toBe(false);
    expect(page.findAll("figure h2").map((title) => title.text())).toEqual(["Preis"]);
    expect(page.text()).toContain("Für diesen Tag liegen noch keine Messwerte zur Erzeugung vor.");
  });

  it("is in English at /en/day/…", async () => {
    const page = await mountSuspended(DayPage, { route: "/en/day/2026-11-13" });

    expect(page.find("h1").text()).toBe("Electricity on Friday, 13 November 2026");
    expect(page.find('nav a[rel="next"]').attributes("href")).toBe("/en/day/2026-11-14");
    expect(page.find('footer a[hreflang="de-DE"]').attributes("href")).toBe("/tag/2026-11-13");
  });
});
