import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import BestWindows from "~/components/BestWindows.vue";
import LineChart from "~/components/LineChart.vue";
import MixChart from "~/components/MixChart.vue";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api";

const today = readDayFixture("2026-11-14");
const tomorrow = readDayFixture("2026-11-15");
const dashboard = buildDashboard(today, tomorrow, API_RECORDED_AT);

// The components render in English under /en; the pages test both languages.
describe("LineChart", () => {
  const props = {
    starts: dashboard.timeline.starts,
    values: dashboard.timeline.price,
    nowSlot: dashboard.nowSlot,
    daySplit: dashboard.todaySlots,
    windows: dashboard.recommendations.map((entry) => ({
      duration: entry.duration,
      window: entry.cheapest,
    })),
    windowLabel: "Cheapest",
    color: "var(--price)",
    format: formattersFor("en-GB").price,
    formatTick: formattersFor("en-GB").whole,
    width: 720,
    height: 280,
    label: "Price chart",
  };

  it("draws the series as one line with a wash under it", async () => {
    const chart = await mountSuspended(LineChart, { props, route: "/en" });

    expect(chart.find("svg").attributes("viewBox")).toBe("0 0 720 280");
    expect(chart.find("path.line").attributes("d")).toMatch(/^M40,/);
    // 192 quarter hours without a gap: the pen is lifted once.
    expect(chart.find("path.line").attributes("d")!.match(/M/g)).toHaveLength(1);
    expect(chart.find("path.wash").attributes("d")).toMatch(/Z$/);
  });

  it("marks the best window of every duration, for CSS to choose from", async () => {
    const chart = await mountSuspended(LineChart, { props, route: "/en" });
    const bands = chart.findAll("g.band");

    expect(bands.map((band) => band.attributes("data-duration"))).toEqual(["1", "2", "3", "4"]);
    expect(bands.map((band) => band.find("text").text())).toEqual([
      "Cheapest 1 h",
      "Cheapest 2 h",
      "Cheapest 3 h",
      "Cheapest 4 h",
    ]);
    // A longer window is a wider band.
    const widths = bands.map((band) => Number(band.find("rect").attributes("width")));
    expect(widths[3]).toBeCloseTo(widths[0]! * 4, 5);
  });

  it("labels both days, the axis from zero, and now", async () => {
    const chart = await mountSuspended(LineChart, { props, route: "/en" });

    expect(chart.findAll("text.day").map((text) => text.text())).toEqual([
      "Today, Saturday",
      "Tomorrow, Sunday",
    ]);
    expect(chart.find("g.grid text").text()).toBe("0");
    expect(chart.find("g.now text").text()).toBe("now");
  });

  it("leaves a gap in the line where values are missing", async () => {
    const values = [...dashboard.timeline.price];
    values.fill(null, 100, 110);
    const chart = await mountSuspended(LineChart, { props: { ...props, values }, route: "/en" });

    expect(chart.find("path.line").attributes("d")!.match(/M/g)).toHaveLength(2);
  });

  it("has fewer time labels when it is narrow", async () => {
    const wide = await mountSuspended(LineChart, { props, route: "/en" });
    const narrow = await mountSuspended(LineChart, {
      props: { ...props, width: 380, height: 250 },
      route: "/en",
    });

    expect(narrow.findAll("g.time > text:not(.day)").length).toBeLessThan(
      wide.findAll("g.time > text:not(.day)").length,
    );
  });
});

describe("MixChart", () => {
  const props = {
    mix: dashboard.mix,
    starts: dashboard.timeline.starts.slice(0, dashboard.todaySlots),
    measured: dashboard.mixSlots,
    nowSlot: dashboard.nowSlot,
    width: 720,
    height: 280,
    label: "Generation chart",
  };

  it("stacks the six groups from conventional at the bottom to solar on top", async () => {
    const chart = await mountSuspended(MixChart, { props, route: "/en" });

    expect(chart.findAll("path.band").map((band) => band.classes()[1])).toEqual([
      "band--other",
      "band--coal",
      "band--gas",
      "band--other_renewables",
      "band--wind",
      "band--solar",
    ]);
  });

  it("only draws the hours that have been measured", async () => {
    const chart = await mountSuspended(MixChart, { props, route: "/en" });
    const path = chart.find("path.band--wind").attributes("d")!;
    const rightEdge = Math.max(
      ...[...path.matchAll(/H([\d.]+)/g)].map((match) => Number(match[1])),
    );

    // The plot is 668 px wide for 96 quarter hours, starting at x = 40.
    expect(rightEdge).toBeCloseTo(40 + (668 * dashboard.mixSlots) / 96, 1);
    expect(rightEdge).toBeLessThan(708);
  });
});

describe("BestWindows", () => {
  it("explains why the window is within today before tomorrow's prices are out", async () => {
    const unpublished = structuredClone(tomorrow);
    unpublished.series.price_day_ahead.fill(null);
    const morning = buildDashboard(today, unpublished, Date.parse("2026-11-14T08:00:00Z") / 1000);

    const section = await mountSuspended(BestWindows, {
      props: { dashboard: morning },
      route: "/en",
    });

    expect(section.text()).toContain("Tomorrow's prices are published in the early afternoon");
    expect(section.find('[data-duration="2"] .when').text()).toMatch(/^Today /);
  });

  it("says when no window of that length is left", async () => {
    const unpublished = structuredClone(tomorrow);
    unpublished.series.price_day_ahead.fill(null);
    const late = buildDashboard(today, unpublished, Date.parse("2026-11-14T22:30:00Z") / 1000);

    const section = await mountSuspended(BestWindows, { props: { dashboard: late }, route: "/en" });

    expect(section.find('[data-duration="4"]').text()).toContain(
      "No window of 4 h is left in the prices published so far.",
    );
  });
});
