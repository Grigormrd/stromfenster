/**
 * Records real SMARD responses as test fixtures.
 *
 *   node scripts/record-smard-fixtures.ts snapshot <name>
 *     Every series, for the weeks an import would request right now.
 *
 *   node scripts/record-smard-fixtures.ts weeks <name> <series id> <date> [<date> ...]
 *     One series, for the weeks containing the given dates (YYYY-MM-DD), plus
 *     the list of weeks SMARD has for it.
 *
 * Files are stored under test/fixtures/smard/<name>/ with the same path they
 * have on SMARD, so a test server can serve the directory as is. A week SMARD
 * does not have yet (HTTP 404) is not stored and stays a 404 in tests.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { berlinDayStart, berlinWeekStart, isDateKey } from "../shared/utils/berlin-time.ts";
import { importWindow } from "../shared/utils/import-window.ts";
import { SERIES, SERIES_IDS } from "../shared/utils/series.ts";
import type { SeriesId } from "../shared/utils/series.ts";
import { SMARD_BASE_URL, smardIndexUrl, smardWeekUrl } from "../server/utils/smard.ts";

const [mode, name, ...rest] = process.argv.slice(2);
if ((mode !== "snapshot" && mode !== "weeks") || !name) {
  console.error("Usage: see the comment at the top of this file.");
  process.exit(1);
}

const root = join(import.meta.dirname, "..", "test", "fixtures", "smard", name);
const recordedAt = Math.floor(Date.now() / 1000);

async function record(url: string): Promise<"stored" | "missing"> {
  const response = await fetch(url);
  if (response.status === 404) return "missing";
  if (!response.ok) throw new Error(`GET ${url} answered with HTTP ${response.status}`);
  const file = join(root, url.slice(SMARD_BASE_URL.length + 1));
  await mkdir(dirname(file), { recursive: true });
  // Stored byte for byte, so the tests read what SMARD sent.
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return "stored";
}

const requests: { url: string; result: "stored" | "missing" }[] = [];

if (mode === "snapshot") {
  const { weekStarts } = importWindow(recordedAt);
  for (const id of SERIES_IDS) {
    for (const weekStart of weekStarts) {
      const url = smardWeekUrl(SMARD_BASE_URL, SERIES[id], weekStart);
      requests.push({ url, result: await record(url) });
    }
  }
} else {
  const [id, ...dates] = rest;
  if (!id || !(id in SERIES) || dates.length === 0 || !dates.every(isDateKey)) {
    console.error("Usage: see the comment at the top of this file.");
    process.exit(1);
  }
  const series = SERIES[id as SeriesId];
  const indexUrl = smardIndexUrl(SMARD_BASE_URL, series);
  requests.push({ url: indexUrl, result: await record(indexUrl) });
  for (const date of dates) {
    const url = smardWeekUrl(SMARD_BASE_URL, series, berlinWeekStart(berlinDayStart(date)));
    requests.push({ url, result: await record(url) });
  }
}

await mkdir(root, { recursive: true });
await writeFile(
  join(root, "recording.json"),
  JSON.stringify(
    { recordedAt: new Date(recordedAt * 1000).toISOString(), source: SMARD_BASE_URL, requests },
    null,
    2,
  ) + "\n",
);

for (const { url, result } of requests) console.log(result.padEnd(8), url);
