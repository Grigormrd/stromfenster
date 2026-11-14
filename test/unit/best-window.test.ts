import { describe, expect, it } from "vitest";
import { bestWindow } from "../../shared/utils/best-window.ts";
import { buildTimeline, slotAt } from "../../shared/utils/timeline.ts";
import { API_RECORDED_AT, readDayFixture } from "../fixtures/api.ts";

describe("bestWindow", () => {
  it("finds the cheapest stretch", () => {
    const window = bestWindow([5, 4, 1, 2, 9, 9], 2, { pick: "lowest" });

    expect(window).toEqual({ start: 2, end: 4, average: 1.5 });
  });

  it("finds the highest stretch", () => {
    const window = bestWindow([0.2, 0.9, 0.8, 0.1], 2, { pick: "highest" });

    expect(window?.start).toBe(1);
    expect(window?.average).toBeCloseTo(0.85);
  });

  it("only considers windows that start at or after `from`", () => {
    const window = bestWindow([1, 1, 5, 4, 3, 6], 2, { from: 2, pick: "lowest" });

    expect(window).toEqual({ start: 3, end: 5, average: 3.5 });
  });

  it("does not treat a gap as a cheap quarter hour", () => {
    const window = bestWindow([5, null, 1, 6, 7, 2], 2, { pick: "lowest" });

    expect(window).toEqual({ start: 2, end: 4, average: 3.5 });
  });

  it("takes the earliest of equally good windows", () => {
    const window = bestWindow([3, 3, 3, 3], 2, { pick: "lowest" });

    expect(window?.start).toBe(0);
  });

  it("handles negative prices", () => {
    const window = bestWindow([2, -3, -1, 4], 2, { pick: "lowest" });

    expect(window).toEqual({ start: 1, end: 3, average: -2 });
  });

  it("returns nothing when no complete window fits", () => {
    expect(bestWindow([1, 2, 3], 4, { pick: "lowest" })).toBeNull();
    expect(bestWindow([1, null, 3], 2, { pick: "lowest" })).toBeNull();
    expect(bestWindow([1, 2, 3], 2, { from: 2, pick: "lowest" })).toBeNull();
    expect(bestWindow([], 1, { pick: "lowest" })).toBeNull();
    expect(bestWindow([1, 2], 0, { pick: "lowest" })).toBeNull();
  });

  it("agrees with checking every window, on two recorded days", () => {
    const timeline = buildTimeline([readDayFixture("2026-11-14"), readDayFixture("2026-11-15")]);
    const from = slotAt(timeline, API_RECORDED_AT) + 1;

    for (const length of [4, 8, 12, 16]) {
      // The slow, obvious way: average every window and keep the first minimum.
      let expected: { start: number; average: number } | null = null;
      for (let start = from; start + length <= timeline.price.length; start++) {
        const values = timeline.price.slice(start, start + length);
        if (values.some((value) => value === null)) continue;
        const average = (values as number[]).reduce((sum, value) => sum + value, 0) / length;
        if (expected === null || average < expected.average) expected = { start, average };
      }

      const window = bestWindow(timeline.price, length, { from, pick: "lowest" });

      expect(window?.start).toBe(expected?.start);
      expect(window?.average).toBeCloseTo(expected!.average, 9);
      expect(window!.end - window!.start).toBe(length);
    }
  });
});
