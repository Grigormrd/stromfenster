import { describe, expect, it } from "vitest";
import { SERIES_IDS } from "../../shared/utils/series.ts";
import { seriesForRun } from "../../worker/src/schedule.ts";

const start = Date.parse("2026-11-14T10:37:00Z") / 1000;

describe("seriesForRun", () => {
  it("imports one series per run", () => {
    expect(seriesForRun(start)).toHaveLength(1);
    expect(SERIES_IDS).toContain(seriesForRun(start)[0]);
  });

  it("gives every series its turn within one round, wherever the round starts", () => {
    for (const offset of [0, 1, 7, 16, 1000]) {
      const due = SERIES_IDS.flatMap((_id, minute) => seriesForRun(start + (offset + minute) * 60));

      expect([...due].sort()).toEqual([...SERIES_IDS].sort());
    }
  });

  it("does not change within a minute", () => {
    expect(seriesForRun(start + 59)).toEqual(seriesForRun(start));
    expect(seriesForRun(start + 60)).not.toEqual(seriesForRun(start));
  });

  it("comes back to a series after as many minutes as there are series", () => {
    expect(seriesForRun(start + SERIES_IDS.length * 60)).toEqual(seriesForRun(start));
  });
});
