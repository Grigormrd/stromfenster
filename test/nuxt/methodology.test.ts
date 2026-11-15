import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";
import MethodologyPage from "~/pages/methodology.vue";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api";

registerEndpoint("/api/days/2026-11-14", () => readDayFixture("2026-11-14"));
registerEndpoint("/api/days/2026-11-15", () => readDayFixture("2026-11-15"));

describe("methodology page", () => {
  it("has one heading and a section for everything the start page links to", async () => {
    const page = await mountSuspended(MethodologyPage);

    expect(page.findAll("h1")).toHaveLength(1);
    expect(page.findAll("section").map((section) => section.attributes("id"))).toEqual([
      "data",
      "prices",
      "window",
      "wind-solar",
      "generation",
      "co2",
      "time",
    ]);
  });

  it("lists the emission factor of every generation series, highest first", async () => {
    const page = await mountSuspended(MethodologyPage);
    const rows = page.findAll("#co2 tbody tr").map((row) => ({
      label: row.find("th").text(),
      cells: row.findAll("td").map((cell) => cell.text()),
    }));

    expect(rows).toHaveLength(Object.keys(EMISSION_FACTORS).length);
    expect(rows.slice(0, 4).map((row) => [row.label, row.cells[0], row.cells[1]])).toEqual([
      ["Lignite", "1,119", "Published"],
      ["Hard coal", "860", "Published"],
      ["Other conventional", "860", "Stand-in"],
      ["Natural gas", "392", "Published"],
    ]);
    // Everything else counts as zero, and says why.
    for (const row of rows.slice(4)) {
      expect(row.cells[0]).toBe("0");
      expect(row.cells[1]).toBe("Counted as zero");
      expect(row.cells[2]).not.toBe("");
    }
  });

  it("names the source of the factors and links to it", async () => {
    const page = await mountSuspended(MethodologyPage);
    const source = page.find(`#co2 a[href="${EMISSION_SOURCE.url}"]`);

    expect(source.exists()).toBe(true);
    expect(source.text()).toContain("Treibhausgas-Emissionen des deutschen Strommix");
    expect(page.find("#co2").text()).toContain("Climate Change 13/2025, Table 4");
    expect(page.find("#co2").text()).toContain("363 g/kWh");
  });

  it("says what the CO₂ estimate leaves out", async () => {
    const text = (await mountSuspended(MethodologyPage)).find("#co2").text();

    expect(text).toContain("an estimate, not a measurement");
    expect(text).toContain("Imports and exports.");
    expect(text).toContain("The hard coal value is used in its place.");
  });

  it("says that the wholesale price is not what a household pays", async () => {
    const text = (await mountSuspended(MethodologyPage)).find("#prices").text();

    expect(text).toContain("It is not what a household pays.");
    expect(text).toContain("taxes, levies, grid fees");
  });

  it("shows which series make up each group of the generation chart", async () => {
    const page = await mountSuspended(MethodologyPage);
    const rows = page.findAll("#generation tbody tr").map((row) => row.text());

    expect(rows).toHaveLength(MIX_GROUPS.length);
    expect(rows[0]).toContain("Solar");
    expect(rows.find((row) => row.startsWith("Coal"))).toContain("Lignite, Hard coal");
    expect(rows.find((row) => row.startsWith("Wind"))).toContain("Wind onshore, Wind offshore");
  });

  it("credits the data source", async () => {
    const page = await mountSuspended(MethodologyPage);

    expect(page.find("#data").text()).toContain("Bundesnetzagentur | SMARD.de");
    expect(page.find('#data a[href="https://creativecommons.org/licenses/by/4.0/"]').exists()).toBe(
      true,
    );
  });
});

describe("start page figures", () => {
  const dashboard = buildDashboard(
    readDayFixture("2026-11-14"),
    readDayFixture("2026-11-15"),
    API_RECORDED_AT,
  );

  it("shows the estimated CO₂ of the latest measurement and of the day so far", async () => {
    const page = await mountSuspended(IndexPage);
    const figures = page.findAll(".figures > div").map((figure) => ({
      label: figure.find("dt").text(),
      value: figure.find("dd").text(),
      note: figure.find(".figure-note").text(),
    }));

    expect(figures.map((figure) => figure.label)).toEqual([
      "CO₂ per kWh, latest",
      "CO₂ per kWh, today so far",
      "Renewables, latest",
    ]);
    expect(figures[0]!.value).toBe(formatGrams(dashboard.co2.latest!));
    expect(figures[0]!.note).toMatch(/^\d\d:\d\d–\d\d:\d\d, estimate$/);
    expect(figures[1]!.value).toBe(formatGrams(dashboard.co2.todaySoFar!));
    expect(figures[1]!.note).toBe("German mix in 2024: 363 g/kWh");
    expect(figures[2]!.value).toBe(formatShare(dashboard.renewableShareLatest!));
  });

  it("links every estimate and the price to its explanation", async () => {
    const page = await mountSuspended(IndexPage);
    const links = page.findAll("a").map((link) => link.attributes("href"));

    expect(links).toContain("/methodology#prices");
    expect(links).toContain("/methodology#co2");
    expect(links).toContain("/methodology");
    expect(page.find(".price-note").text()).toContain("These are wholesale prices.");
  });
});
