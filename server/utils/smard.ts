import type { SeriesDefinition } from "../../shared/utils/series.ts";
import { RESOLUTION_SECONDS } from "../../shared/utils/series.ts";

export const SMARD_BASE_URL = "https://www.smard.de/app/chart_data";

/** Loads a JSON document; resolves to `null` when it does not exist (HTTP 404). */
export type FetchJson = (url: string) => Promise<unknown>;

export class SmardFormatError extends Error {
  override name = "SmardFormatError";
}

/** A value of one quarter hour; `start` is in epoch seconds. */
export interface SmardValue {
  start: number;
  value: number;
}

/** URL of the list of weeks SMARD has for a series. */
export function smardIndexUrl(baseUrl: string, series: SeriesDefinition): string {
  return `${baseUrl}/${series.filter}/${series.region}/index_quarterhour.json`;
}

/** URL of one weekly file. `weekStart` is Monday, midnight in Berlin, in epoch seconds. */
export function smardWeekUrl(baseUrl: string, series: SeriesDefinition, weekStart: number): string {
  const { filter, region } = series;
  return `${baseUrl}/${filter}/${region}/${filter}_${region}_quarterhour_${weekStart * 1000}.json`;
}

/**
 * Turns a weekly SMARD file into values on our grid.
 *
 * SMARD sends `{ series: [[milliseconds, value | null], ...] }`. Quarter hours
 * without a value yet are `null` and are dropped. Anything that does not fit
 * the expected shape is an error: a silent misread would end up in the charts.
 */
export function parseSmardWeek(json: unknown): SmardValue[] {
  const rows = (json as { series?: unknown } | null)?.series;
  if (!Array.isArray(rows)) throw new SmardFormatError("Expected an object with a `series` array");

  const values: SmardValue[] = [];
  let previous = -Infinity;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 2) {
      throw new SmardFormatError(`Expected [timestamp, value], got ${JSON.stringify(row)}`);
    }
    const [milliseconds, value] = row as [unknown, unknown];
    if (typeof milliseconds !== "number" || !Number.isInteger(milliseconds)) {
      throw new SmardFormatError(`Timestamp is not an integer: ${JSON.stringify(milliseconds)}`);
    }
    const start = milliseconds / 1000;
    if (start % RESOLUTION_SECONDS !== 0) {
      throw new SmardFormatError(`Timestamp is not on the quarter-hour grid: ${milliseconds}`);
    }
    if (start <= previous) {
      throw new SmardFormatError(`Timestamps are not ascending at ${milliseconds}`);
    }
    previous = start;

    if (value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new SmardFormatError(`Value is not a number: ${JSON.stringify(value)}`);
    }
    values.push({ start, value });
  }
  return values;
}

/** The values of one week, or an empty list if SMARD has no file for that week yet. */
export async function fetchSmardWeek(
  fetchJson: FetchJson,
  baseUrl: string,
  series: SeriesDefinition,
  weekStart: number,
): Promise<SmardValue[]> {
  const json = await fetchJson(smardWeekUrl(baseUrl, series, weekStart));
  return json === null ? [] : parseSmardWeek(json);
}

/** `FetchJson` on top of the platform's `fetch`. */
export const fetchJsonOverHttp: FetchJson = async (url) => {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 404) {
    await response.body?.cancel();
    return null;
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`GET ${url} answered with HTTP ${response.status}`);
  }
  return response.json();
};
