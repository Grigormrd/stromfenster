/**
 * Renders the link preview image, public/og.png (1200 × 630).
 *
 *   node scripts/og-image.ts
 *
 * The curve is the day-ahead price of a recorded day, so the image shows real
 * data, and the band marks its cheapest two hours. Run it again only if the
 * design changes; the image does not show current prices.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { bestWindow } from "../shared/utils/best-window.ts";
import { centsPerKwh } from "../shared/utils/timeline.ts";
import { readDayFixture } from "../test/fixtures/api.ts";

const WIDTH = 1200;
const HEIGHT = 630;
const day = readDayFixture("2026-11-13");
const prices = day.series.price_day_ahead.map((value) =>
  value === null ? null : centsPerKwh(value),
);
const known = prices.filter((value): value is number => value !== null);
const cheapest = bestWindow(prices, 8, { pick: "lowest" })!;

// The chart fills the lower part of the image.
const chart = { left: 80, right: WIDTH - 80, top: 330, bottom: HEIGHT - 70 };
const min = 0;
const max = Math.ceil(Math.max(...known) / 5) * 5;
const x = (slot: number) => chart.left + ((chart.right - chart.left) * slot) / prices.length;
const y = (value: number) =>
  chart.bottom - ((chart.bottom - chart.top) * (value - min)) / (max - min);

let line = "";
let area = `M${x(0)},${chart.bottom}`;
prices.forEach((value, slot) => {
  if (value === null) return;
  const command = line === "" ? "M" : "L";
  line += `${command}${x(slot).toFixed(1)},${y(value).toFixed(1)}H${x(slot + 1).toFixed(1)}`;
  area += `L${x(slot).toFixed(1)},${y(value).toFixed(1)}H${x(slot + 1).toFixed(1)}`;
});
area += `L${x(prices.length)},${chart.bottom}Z`;

const font = "Segoe UI, system-ui, -apple-system, Roboto, sans-serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#0f1318"/>
  <text x="80" y="128" fill="#eef1f5" font-family="${font}" font-size="76" font-weight="700">Stromfenster</text>
  <text x="80" y="196" fill="#c3c2b7" font-family="${font}" font-size="36">Wann ist Strom günstig und sauber?</text>
  <text x="80" y="246" fill="#898781" font-family="${font}" font-size="30">When is electricity cheap and clean?</text>
  <rect x="${x(cheapest.start)}" y="${chart.top - 20}" width="${x(cheapest.end) - x(cheapest.start)}" height="${chart.bottom - chart.top + 20}" fill="#3987e5" opacity="0.22"/>
  <line x1="${chart.left}" x2="${chart.right}" y1="${chart.bottom}" y2="${chart.bottom}" stroke="#383835" stroke-width="2"/>
  <path d="${area}" fill="#3987e5" opacity="0.12"/>
  <path d="${line}" fill="none" stroke="#3987e5" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="${chart.left}" y="${HEIGHT - 28}" fill="#898781" font-family="${font}" font-size="24">Day-ahead · ct/kWh · Bundesnetzagentur | SMARD.de</text>
</svg>`;

const output = join(import.meta.dirname, "..", "public", "og.png");
await writeFile(output, await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
console.log(`wrote ${output}`);
