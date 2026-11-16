import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";
import { readDayFixture } from "../fixtures/api";

// The page is rendered for the evening of 14 November 2026, when these
// responses were recorded from the deployed API (see vitest.config.ts).
registerEndpoint("/api/days/2026-11-14", () => readDayFixture("2026-11-14"));
registerEndpoint("/api/days/2026-11-15", () => readDayFixture("2026-11-15"));

const german = () => mountSuspended(IndexPage, { route: "/" });
const english = () => mountSuspended(IndexPage, { route: "/en" });

describe("start page in German, at the root", () => {
  it("renders the project name as the only top-level heading", async () => {
    const page = await german();

    const headings = page.findAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe("Stromfenster");
    expect(page.find(".lead").text()).toBe("Wann ist Strom in Deutschland günstig und sauber?");
  });

  it("answers the question for every duration, with two hours selected", async () => {
    const page = await german();

    const radios = page.findAll<HTMLInputElement>('input[name="duration"]');
    expect(radios.map((radio) => radio.element.value)).toEqual(["1", "2", "3", "4"]);
    expect(
      radios.filter((radio) => radio.element.checked).map((radio) => radio.element.value),
    ).toEqual(["2"]);
    expect(page.findAll(".durations label").map((label) => label.text())).toEqual([
      "1 Std.",
      "2 Std.",
      "3 Std.",
      "4 Std.",
    ]);

    // A cheapest and a cleanest window per duration, all in the future.
    const answers = page.findAll(".when").map((answer) => answer.text());
    expect(answers).toHaveLength(8);
    for (const answer of answers) {
      expect(answer).toMatch(/^(Heute|Morgen) \d\d:\d\d(–| – morgen )\d\d:\d\d$/);
    }
  });

  it("writes prices with a decimal comma", async () => {
    const page = await german();
    const twoHours = page.find('section.best [data-duration="2"]');

    expect(twoHours.find(".when").text()).toBe("Morgen 10:45–12:45");
    expect(twoHours.text()).toContain("im Schnitt 9,9 ct/kWh");
    expect(twoHours.text()).toContain("jetzt 20,3 ct/kWh");
  });

  it("draws each chart for wide and for narrow screens", async () => {
    const page = await german();
    const charts = page.findAll('svg[role="img"]');

    expect(charts).toHaveLength(6);
    expect(charts.every((chart) => chart.attributes("aria-label"))).toBe(true);
    expect(page.findAll("figure h2").map((title) => title.text())).toEqual([
      "Preis",
      "Wind und Sonne",
      "Erzeugung heute",
    ]);
  });

  it("has a table for every chart", async () => {
    const page = await german();
    const tables = page.findAll("details table");

    expect(tables).toHaveLength(3);
    // 24 hours, today and tomorrow side by side.
    expect(tables[0]!.findAll("tbody tr")).toHaveLength(24);
    expect(tables[0]!.find("tbody tr").text()).toMatch(/^00:00/);
    expect(tables[0]!.find("tbody td").text()).toMatch(/^\d+,\d$/);
    // Generation only has rows for the hours that were measured.
    expect(tables[2]!.findAll("tbody tr").length).toBeLessThan(24);
    // The hour, six groups and the estimated CO₂.
    const columns = tables[2]!.findAll("thead th").map((heading) => heading.text());
    expect(columns).toEqual([
      "Stunde",
      "Sonstige",
      "Kohle",
      "Erdgas",
      "Biomasse und Wasser",
      "Wind",
      "Sonne",
      "CO₂",
    ]);
  });

  it("links to the German methodology and to the English page", async () => {
    const page = await german();
    const links = page.findAll("a").map((link) => link.attributes("href"));

    expect(links).toContain("/methodik");
    expect(links).toContain("/methodik#co2");
    expect(links).toContain("/methodik#prices");
    expect(page.find('footer a[hreflang="en-GB"]').attributes("href")).toBe("/en");
    expect(page.find('footer a[hreflang="en-GB"]').text()).toBe("English");
  });

  it("names the source and its licence", async () => {
    const page = await german();
    const links = page.findAll("footer a").map((link) => link.attributes("href"));

    expect(page.find("footer").text()).toContain("Bundesnetzagentur | SMARD.de");
    expect(links).toContain("https://www.smard.de");
    expect(links).toContain("https://creativecommons.org/licenses/by/4.0/");
  });

  it("does not warn about stale data when the current price is known", async () => {
    const page = await german();

    expect(page.find(".stale").exists()).toBe(false);
    expect(page.find(".unavailable").exists()).toBe(false);
  });
});

describe("start page in English, under /en", () => {
  it("asks and answers in English", async () => {
    const page = await english();
    const twoHours = page.find('section.best [data-duration="2"]');

    expect(page.find(".lead").text()).toBe("When is electricity in Germany cheap and clean?");
    expect(twoHours.find(".when").text()).toBe("Tomorrow 10:45–12:45");
    expect(twoHours.text()).toContain("9.9 ct/kWh on average");
    expect(twoHours.text()).toContain("now 20.3 ct/kWh");
  });

  it("titles the charts and the table in English", async () => {
    const page = await english();

    expect(page.findAll("figure h2").map((title) => title.text())).toEqual([
      "Price",
      "Wind and solar",
      "Generation today",
    ]);
    expect(page.findAll("details table")[2]!.find("thead th").text()).toBe("Hour");
  });

  it("links to the English methodology and back to the German page", async () => {
    const page = await english();
    const links = page.findAll("a").map((link) => link.attributes("href"));

    expect(links).toContain("/en/methodology");
    expect(links).toContain("/en/methodology#co2");
    expect(page.find('footer a[hreflang="de-DE"]').attributes("href")).toBe("/");
    expect(page.find('footer a[hreflang="de-DE"]').text()).toBe("Deutsch");
  });
});
