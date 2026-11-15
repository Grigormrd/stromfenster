import { describe, expect, it } from "vitest";
import { buildDashboard, DURATIONS } from "../../shared/utils/dashboard.ts";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api.ts";

const yesterday = readDayFixture("2026-11-13");
const today = readDayFixture("2026-11-14");
const tomorrow = readDayFixture("2026-11-15");

describe("buildDashboard on the recorded evening of 14 November", () => {
  const dashboard = buildDashboard(today, tomorrow, API_RECORDED_AT);

  it("knows the current quarter hour and its price", () => {
    // 20:30 UTC is 21:30 in Berlin: slot 86 of the day.
    expect(dashboard.nowSlot).toBe(86);
    expect(dashboard.currentPrice).toBeCloseTo(today.series.price_day_ahead[86]! / 10);
    expect(dashboard.stale).toBe(false);
  });

  it("recommends a window for every duration, none of which has started", () => {
    expect(dashboard.recommendations.map((entry) => entry.duration)).toEqual([...DURATIONS]);

    for (const { duration, cheapest, cleanest } of dashboard.recommendations) {
      for (const window of [cheapest, cleanest]) {
        expect(window).not.toBeNull();
        expect(window!.start).toBeGreaterThan(dashboard.nowSlot);
        expect(window!.end - window!.start).toBe(duration * 4);
      }
    }
  });

  it("never recommends a longer window that is cheaper than a shorter one", () => {
    const averages = dashboard.recommendations.map((entry) => entry.cheapest!.average);

    // The best four hours cannot beat the best single hour.
    for (let index = 1; index < averages.length; index++) {
      expect(averages[index]!).toBeGreaterThanOrEqual(averages[index - 1]! - 1e-9);
    }
  });

  it("finds the cheapest two hours where the prices are lowest", () => {
    const two = dashboard.recommendations.find((entry) => entry.duration === 2)!.cheapest!;
    const prices = dashboard.timeline.price.slice(two.start, two.end) as number[];

    expect(two.average).toBeCloseTo(prices.reduce((sum, price) => sum + price, 0) / 8, 9);
    // The window is cheaper than running the appliance right now.
    expect(two.average).toBeLessThan(dashboard.currentPrice!);
  });

  it("sees that tomorrow's prices are published", () => {
    expect(dashboard.hasTomorrow).toBe(true);
    expect(dashboard.todaySlots).toBe(96);
  });

  it("estimates the CO₂ intensity of what has been measured today", () => {
    const { co2, mixSlots, renewableShareLatest } = dashboard;

    expect(co2.series).toHaveLength(96);
    expect(co2.series[mixSlots - 1]).toBe(co2.latest);
    expect(co2.series[mixSlots]).toBeNull();
    expect(co2.latest).toBeGreaterThan(0);
    expect(co2.todaySoFar).toBeGreaterThan(0);
    expect(co2.todaySoFar).toBeLessThan(1119);
    expect(renewableShareLatest).toBeGreaterThan(0);
    expect(renewableShareLatest).toBeLessThan(1);
  });

  it("has no CO₂ figures before anything is measured", () => {
    const { co2, renewableShareLatest } = buildDashboard(tomorrow, tomorrow, API_RECORDED_AT);

    expect(co2.latest).toBeNull();
    expect(co2.todaySoFar).toBeNull();
    expect(renewableShareLatest).toBeNull();
  });

  it("has today's measured generation up to the evening", () => {
    expect(dashboard.mixSlots).toBeGreaterThan(70);
    expect(dashboard.mixSlots).toBeLessThan(96);
    expect(dashboard.mix.wind[dashboard.mixSlots - 1]).not.toBeNull();
  });
});

describe("buildDashboard in other situations", () => {
  it("still recommends within today when tomorrow's prices are not published yet", () => {
    const unpublished = structuredClone(tomorrow);
    unpublished.series.price_day_ahead.fill(null);
    const morning = Date.parse("2026-11-14T08:00:00Z") / 1000;

    const dashboard = buildDashboard(today, unpublished, morning);
    const two = dashboard.recommendations.find((entry) => entry.duration === 2)!.cheapest!;

    expect(dashboard.hasTomorrow).toBe(false);
    expect(two.end).toBeLessThanOrEqual(96);
    expect(two.start).toBeGreaterThan(dashboard.nowSlot);
  });

  it("has no recommendation when too little of the known period is left", () => {
    const unpublished = structuredClone(tomorrow);
    unpublished.series.price_day_ahead.fill(null);
    // 23:30 in Berlin: two quarter hours with a price remain, the current one has begun.
    const lateEvening = Date.parse("2026-11-14T22:30:00Z") / 1000;

    const dashboard = buildDashboard(today, unpublished, lateEvening);

    expect(dashboard.recommendations.every((entry) => entry.cheapest === null)).toBe(true);
  });

  it("is stale when the days shown do not contain the current time", () => {
    const dashboard = buildDashboard(yesterday, today, Date.parse("2026-11-16T10:00:00Z") / 1000);

    expect(dashboard.nowSlot).toBe(-1);
    expect(dashboard.currentPrice).toBeNull();
    expect(dashboard.stale).toBe(true);
  });

  it("is stale when the import has not delivered the current price", () => {
    const behind = structuredClone(today);
    behind.series.price_day_ahead.fill(null, 80);

    expect(buildDashboard(behind, tomorrow, API_RECORDED_AT).stale).toBe(true);
  });
});
