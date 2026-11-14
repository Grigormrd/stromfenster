import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DayData } from "../../shared/utils/day-data.ts";

/**
 * Responses of the pipeline's API, recorded from the deployed Worker.
 * 13 November is complete, 14 November is the day of recording (measured
 * values stop in the evening), 15 November has prices and forecasts only.
 */
export const RECORDED_DAYS = ["2026-11-13", "2026-11-14", "2026-11-15"] as const;

/** When the responses were recorded, in epoch seconds. */
export const API_RECORDED_AT = Date.parse("2026-11-14T20:30:46Z") / 1000;

export function readDayFixture(date: (typeof RECORDED_DAYS)[number]): DayData {
  const file = join(import.meta.dirname, "api", `day-${date}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as DayData;
}
