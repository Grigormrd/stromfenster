import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";
import { readDayFixture } from "../fixtures/api";

// The page is rendered for the evening of 14 November 2026, when these
// responses were recorded from the deployed API (see vitest.config.ts).
registerEndpoint("/api/days/2026-11-14", () => readDayFixture("2026-11-14"));
registerEndpoint("/api/days/2026-11-15", () => readDayFixture("2026-11-15"));

describe("start page", () => {
  it("renders the project name as the only top-level heading", async () => {
    const page = await mountSuspended(IndexPage);

    const headings = page.findAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe("Stromfenster");
    expect(page.text()).toContain("When is electricity in Germany cheap and clean?");
  });

  it("answers the question for every duration, with two hours selected", async () => {
    const page = await mountSuspended(IndexPage);

    const radios = page.findAll<HTMLInputElement>('input[name="duration"]');
    expect(radios.map((radio) => radio.element.value)).toEqual(["1", "2", "3", "4"]);
    expect(
      radios.filter((radio) => radio.element.checked).map((radio) => radio.element.value),
    ).toEqual(["2"]);

    // A cheapest and a cleanest window per duration, all in the future.
    const answers = page.findAll(".when").map((answer) => answer.text());
    expect(answers).toHaveLength(8);
    for (const answer of answers) {
      expect(answer).toMatch(/^(Today|Tomorrow) \d\d:\d\d(–| – tomorrow )\d\d:\d\d$/);
    }
  });

  it("names the cheapest two hours and their price, next to the price now", async () => {
    const page = await mountSuspended(IndexPage);
    const twoHours = page.find('section.best [data-duration="2"]');

    expect(twoHours.find(".when").text()).toBe("Tomorrow 10:45–12:45");
    expect(twoHours.text()).toContain("9.9 ct/kWh on average");
    expect(twoHours.text()).toContain("now 20.3 ct/kWh");
  });

  it("draws each chart for wide and for narrow screens", async () => {
    const page = await mountSuspended(IndexPage);
    const charts = page.findAll('svg[role="img"]');

    expect(charts).toHaveLength(6);
    expect(charts.every((chart) => chart.attributes("aria-label"))).toBe(true);
    expect(page.findAll("figure")).toHaveLength(3);
    expect(page.findAll("figure h2").map((title) => title.text())).toEqual([
      "Price",
      "Wind and solar",
      "Generation today",
    ]);
  });

  it("has a table for every chart", async () => {
    const page = await mountSuspended(IndexPage);
    const tables = page.findAll("details table");

    expect(tables).toHaveLength(3);
    // 24 hours, today and tomorrow side by side.
    expect(tables[0]!.findAll("tbody tr")).toHaveLength(24);
    expect(tables[0]!.find("tbody tr").text()).toMatch(/^00:00/);
    // Generation only has rows for the hours that were measured.
    expect(tables[2]!.findAll("tbody tr").length).toBeLessThan(24);
    // The hour, six groups and the estimated CO₂.
    const columns = tables[2]!.findAll("thead th").map((heading) => heading.text());
    expect(columns).toHaveLength(8);
    expect(columns.at(-1)).toBe("CO₂");
  });

  it("names the source and its licence", async () => {
    const page = await mountSuspended(IndexPage);
    const links = page.findAll("footer a").map((link) => link.attributes("href"));

    expect(page.find("footer").text()).toContain("Bundesnetzagentur | SMARD.de");
    expect(links).toContain("https://www.smard.de");
    expect(links).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  it("does not warn about stale data when the current price is known", async () => {
    const page = await mountSuspended(IndexPage);

    expect(page.find(".stale").exists()).toBe(false);
    expect(page.find(".unavailable").exists()).toBe(false);
  });
});
