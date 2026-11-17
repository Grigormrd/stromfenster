import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";
import MethodologyPage from "~/pages/methodology.vue";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api";

registerEndpoint("/api/days/2026-11-14", () => readDayFixture("2026-11-14"));
registerEndpoint("/api/days/2026-11-15", () => readDayFixture("2026-11-15"));

const german = () => mountSuspended(MethodologyPage, { route: "/methodik" });
const english = () => mountSuspended(MethodologyPage, { route: "/en/methodology" });

const SECTIONS = ["data", "prices", "window", "wind-solar", "generation", "co2", "time"];

describe("methodology page in both languages", () => {
  it("has one heading and the same sections, so the links work in either language", async () => {
    for (const [mount, heading] of [
      [german, "So werden die Zahlen berechnet"],
      [english, "How the figures are calculated"],
    ] as const) {
      const page = await mount();

      expect(page.findAll("h1").map((title) => title.text())).toEqual([heading]);
      expect(page.findAll("section").map((section) => section.attributes("id"))).toEqual(SECTIONS);
    }
  });

  it("lists the emission factor of every generation series, highest first", async () => {
    const rows = (await german()).findAll("#co2 tbody tr").map((row) => ({
      label: row.find("th").text(),
      cells: row.findAll("td").map((cell) => cell.text()),
    }));

    expect(rows).toHaveLength(Object.keys(EMISSION_FACTORS).length);
    expect(rows.slice(0, 4).map((row) => [row.label, row.cells[0], row.cells[1]])).toEqual([
      ["Braunkohle", "1.119", "Veröffentlicht"],
      ["Steinkohle", "860", "Veröffentlicht"],
      ["Sonstige Konventionelle", "860", "Ersatzwert"],
      ["Erdgas", "392", "Veröffentlicht"],
    ]);
    // Everything else counts as zero, and says why.
    for (const row of rows.slice(4)) {
      expect(row.cells[0]).toBe("0");
      expect(row.cells[1]).toBe("Mit null angesetzt");
      expect(row.cells[2]).not.toBe("");
    }
  });

  it("has the same factors in English, with English names and numbers", async () => {
    const rows = (await english()).findAll("#co2 tbody tr").map((row) => ({
      label: row.find("th").text(),
      cells: row.findAll("td").map((cell) => cell.text()),
    }));

    expect(rows.slice(0, 4).map((row) => [row.label, row.cells[0], row.cells[1]])).toEqual([
      ["Lignite", "1,119", "Published"],
      ["Hard coal", "860", "Published"],
      ["Other conventional", "860", "Stand-in"],
      ["Natural gas", "392", "Published"],
    ]);
  });

  it("names the source of the factors and links to it", async () => {
    for (const mount of [german, english]) {
      const co2 = (await mount()).find("#co2");

      expect(co2.find(`a[href="${EMISSION_SOURCE.url}"]`).text()).toContain(
        "Treibhausgas-Emissionen des deutschen Strommix",
      );
      expect(co2.text()).toContain("Climate Change 13/2025");
    }
    expect((await german()).find("#co2").text()).toContain("363 g/kWh");
  });

  it("says what the CO₂ estimate leaves out", async () => {
    const de = (await german()).find("#co2").text();
    const en = (await english()).find("#co2").text();

    expect(de).toContain("eine Schätzung, keine Messung");
    expect(de).toContain("Importe und Exporte.");
    expect(de).toContain("An seiner Stelle steht der Wert für Steinkohle.");
    expect(en).toContain("an estimate, not a measurement");
    expect(en).toContain("Imports and exports.");
    expect(en).toContain("The hard coal value is used in its place.");
  });

  it("says that the wholesale price is not what a household pays", async () => {
    expect((await german()).find("#prices").text()).toContain(
      "Das ist nicht der Preis, den ein Haushalt zahlt.",
    );
    expect((await english()).find("#prices").text()).toContain("It is not what a household pays.");
  });

  it("shows which series make up each group of the generation chart", async () => {
    const rows = (await german()).findAll("#generation tbody tr").map((row) => row.text());

    expect(rows).toHaveLength(MIX_GROUPS.length);
    expect(rows[0]).toContain("Sonne");
    expect(rows.find((row) => row.startsWith("Kohle"))).toContain("Braunkohle, Steinkohle");
    expect(rows.find((row) => row.startsWith("Wind"))).toContain("Wind onshore, Wind offshore");
  });

  it("links back to the start page and to the other language", async () => {
    // The language is global in the app: check each page before mounting the next.
    const de = await german();
    expect(de.find(".back a").attributes("href")).toBe("/");
    expect(de.find('nav a[hreflang="en-GB"]').attributes("href")).toBe("/en/methodology");

    const en = await english();
    expect(en.find(".back a").attributes("href")).toBe("/en");
    expect(en.find('nav a[hreflang="de-DE"]').attributes("href")).toBe("/methodik");
  });

  it("credits the data source", async () => {
    const page = await german();

    expect(page.find("#data").text()).toContain("Bundesnetzagentur | SMARD.de");
    expect(
      page.find('#data a[href^="https://creativecommons.org/licenses/by/4.0/"]').exists(),
    ).toBe(true);
  });
});

describe("start page figures", () => {
  const dashboard = buildDashboard(
    readDayFixture("2026-11-14"),
    readDayFixture("2026-11-15"),
    API_RECORDED_AT,
  );

  const figuresOf = async (route: string) =>
    (await mountSuspended(IndexPage, { route })).findAll(".figures > div").map((figure) => ({
      label: figure.find("dt").text(),
      value: figure.find("dd").text(),
      note: figure.find(".figure-note").text(),
    }));

  it("shows the estimated CO₂ of the latest measurement and of the day so far", async () => {
    const de = formattersFor("de-DE");
    const figures = await figuresOf("/");

    expect(figures.map((figure) => figure.label)).toEqual([
      "CO₂ je kWh, zuletzt",
      "CO₂ je kWh, heute bisher",
      "Erneuerbare, zuletzt",
    ]);
    expect(figures[0]!.value).toBe(de.grams(dashboard.co2.latest!));
    expect(figures[0]!.note).toMatch(/^\d\d:\d\d–\d\d:\d\d, Schätzung$/);
    expect(figures[1]!.value).toBe(de.grams(dashboard.co2.todaySoFar!));
    expect(figures[1]!.note).toBe("Deutscher Strommix 2024: 363 g/kWh");
    expect(figures[2]!.value).toBe(de.share(dashboard.renewableShareLatest!));
  });

  it("shows the same figures in English", async () => {
    const figures = await figuresOf("/en");

    expect(figures.map((figure) => figure.label)).toEqual([
      "CO₂ per kWh, latest",
      "CO₂ per kWh, today so far",
      "Renewables, latest",
    ]);
    expect(figures[1]!.note).toBe("German mix in 2024: 363 g/kWh");
  });

  it("links the price note to its explanation", async () => {
    const page = await mountSuspended(IndexPage, { route: "/" });

    expect(page.find(".price-note").text()).toContain("Das sind Großhandelspreise.");
    expect(page.find(".price-note a").attributes("href")).toBe("/methodik#prices");
  });
});
