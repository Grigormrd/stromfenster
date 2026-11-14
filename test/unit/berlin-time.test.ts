import { describe, expect, it } from "vitest";
import {
  addDays,
  berlinDateKey,
  berlinDayRange,
  berlinDayStart,
  berlinWeekStart,
  isDateKey,
  slotStarts,
} from "../../shared/utils/berlin-time.ts";
import { importWindow } from "../../shared/utils/import-window.ts";
import { RESOLUTION_SECONDS } from "../../shared/utils/series.ts";
import { readFixture } from "../fixtures/smard.ts";

const seconds = (iso: string) => Date.parse(iso) / 1000;

describe("isDateKey", () => {
  it("accepts real calendar dates", () => {
    expect(isDateKey("2026-11-14")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
  });

  it("rejects dates that do not exist and other formats", () => {
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-1-1")).toBe(false);
    expect(isDateKey("14.11.2026")).toBe(false);
    expect(isDateKey("")).toBe(false);
  });
});

describe("berlinDayStart", () => {
  it("is 23:00 UTC of the previous day in winter", () => {
    expect(berlinDayStart("2026-11-14")).toBe(seconds("2026-11-13T23:00:00Z"));
  });

  it("is 22:00 UTC of the previous day in summer", () => {
    expect(berlinDayStart("2026-07-01")).toBe(seconds("2026-06-30T22:00:00Z"));
  });

  it("uses the offset that applies at midnight on the days the clocks change", () => {
    expect(berlinDayStart("2026-03-29")).toBe(seconds("2026-03-28T23:00:00Z"));
    expect(berlinDayStart("2026-03-30")).toBe(seconds("2026-03-29T22:00:00Z"));
    expect(berlinDayStart("2026-10-25")).toBe(seconds("2026-10-24T22:00:00Z"));
    expect(berlinDayStart("2026-10-26")).toBe(seconds("2026-10-25T23:00:00Z"));
  });
});

describe("berlinDayRange", () => {
  const quarterHours = (date: string) => slotStarts(berlinDayRange(date), RESOLUTION_SECONDS);

  it("has 96 quarter hours on a normal day", () => {
    expect(quarterHours("2026-11-14")).toHaveLength(96);
  });

  it("has 92 quarter hours when the clocks go forward", () => {
    expect(quarterHours("2026-03-29")).toHaveLength(92);
  });

  it("has 100 quarter hours when the clocks go back", () => {
    expect(quarterHours("2026-10-25")).toHaveLength(100);
  });

  it("ends where the next day starts", () => {
    expect(berlinDayRange("2026-10-25").end).toBe(berlinDayRange("2026-10-26").start);
  });
});

describe("berlinDateKey", () => {
  it("returns the Berlin date, not the UTC date", () => {
    expect(berlinDateKey(seconds("2026-11-13T23:00:00Z"))).toBe("2026-11-14");
    expect(berlinDateKey(seconds("2026-11-13T22:59:59Z"))).toBe("2026-11-13");
  });

  it("round-trips with berlinDayStart for every day of 2026", () => {
    for (let date = "2026-01-01"; date !== "2027-01-01"; date = addDays(date, 1)) {
      expect(berlinDateKey(berlinDayStart(date))).toBe(date);
    }
  });
});

describe("berlinWeekStart", () => {
  it("is Monday at midnight in Berlin", () => {
    // 14 November 2026 is a Saturday.
    expect(berlinWeekStart(seconds("2026-11-14T10:34:50Z"))).toBe(berlinDayStart("2026-11-09"));
  });

  it("keeps Sunday evening in the old week and Monday midnight in the new one", () => {
    expect(berlinWeekStart(seconds("2026-11-15T22:59:59Z"))).toBe(berlinDayStart("2026-11-09"));
    expect(berlinWeekStart(seconds("2026-11-15T23:00:00Z"))).toBe(berlinDayStart("2026-11-16"));
  });

  it("matches every week SMARD lists for the day-ahead price", () => {
    const { timestamps } = readFixture("clock-changes", "4169/DE-LU/index_quarterhour.json") as {
      timestamps: number[];
    };
    expect(timestamps.length).toBeGreaterThan(400);

    for (const milliseconds of timestamps) {
      const weekStart = milliseconds / 1000;
      // Any moment inside the week must lead back to the week's own start.
      expect(berlinWeekStart(weekStart)).toBe(weekStart);
      expect(berlinWeekStart(weekStart + 3 * 86_400 + 1234)).toBe(weekStart);
    }
  });
});

describe("importWindow", () => {
  it("needs one weekly file in the middle of a week", () => {
    const window = importWindow(seconds("2026-11-12T12:00:00Z"));

    expect(window.weekStarts).toEqual([berlinDayStart("2026-11-09")]);
  });

  it("needs the next week as well when the window reaches into it", () => {
    const now = seconds("2026-11-14T10:34:50Z");
    const window = importWindow(now);

    expect(window.start).toBe(now - 48 * 3600);
    expect(window.end).toBe(now + 48 * 3600);
    expect(window.weekStarts).toEqual([berlinDayStart("2026-11-09"), berlinDayStart("2026-11-16")]);
  });

  it("still reads last week on Monday, when its final values arrive", () => {
    const window = importWindow(seconds("2026-11-16T06:00:00Z"));

    expect(window.weekStarts).toEqual([berlinDayStart("2026-11-09"), berlinDayStart("2026-11-16")]);
  });
});
