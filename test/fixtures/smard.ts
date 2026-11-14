import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SERIES } from "../../shared/utils/series.ts";
import type { SeriesId } from "../../shared/utils/series.ts";

/** Directory with the recorded SMARD responses; see README.md next to it. */
export const SMARD_FIXTURES = join(import.meta.dirname, "smard");

export function readFixture(recording: string, pathOnSmard: string): unknown {
  return JSON.parse(readFileSync(join(SMARD_FIXTURES, recording, pathOnSmard), "utf8"));
}

/** A recorded weekly file. `weekStart` is in epoch seconds. */
export function readWeekFixture(recording: string, id: SeriesId, weekStart: number): unknown {
  const { filter, region } = SERIES[id];
  return readFixture(
    recording,
    `${filter}/${region}/${filter}_${region}_quarterhour_${weekStart * 1000}.json`,
  );
}

/** When a recording was made, in epoch seconds. */
export function recordedAt(recording: string): number {
  const { recordedAt } = readFixture(recording, "recording.json") as { recordedAt: string };
  return Date.parse(recordedAt) / 1000;
}
