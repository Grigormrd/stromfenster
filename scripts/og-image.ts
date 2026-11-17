/**
 * Renders the link preview image, public/og.png (1200 × 630), in Chromium so
 * it is set in the site's own font.
 *
 *   node scripts/og-image.ts
 *
 * The curve is the day-ahead price of a recorded day, so the image shows real
 * data, and the band marks its cheapest two hours. The colours are the site's:
 * green land with a coastline on top, the curve on pale water. Run it again only if the
 * design changes; the image does not show current prices.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";
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
const chart = { left: 80, right: WIDTH - 80, top: 360, bottom: HEIGHT - 76 };
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

const root = join(import.meta.dirname, "..");
const fontData = (
  await readFile(join(root, "public", "fonts", "hanken-grotesk-latin.woff2"))
).toString("base64");
const band = { left: x(cheapest.start), width: x(cheapest.end) - x(cheapest.start) };
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: "Hanken Grotesk"; src: url(data:font/woff2;base64,${fontData}) format("woff2"); font-weight: 100 900; }
html, body { margin: 0; }
svg text { font-family: "Hanken Grotesk"; }
</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="100%" height="100%" fill="#f5f1e4"/>
  <path d="M0 0H1200V236C1126 262 1052 270 970 254C882 236 815 220 715 234C615 248 573 278 465 275C357 272 315 244 223 244C140 244 73 266 0 258Z" fill="#8ed462"/>
  <text x="80" y="118" fill="#2c2e2a" font-size="80" font-weight="800" letter-spacing="-3">Stromfenster</text>
  <text x="80" y="172" fill="#2c2e2a" font-size="34" font-weight="700" letter-spacing="-0.6">Wann ist Strom günstig und sauber?</text>
  <text x="80" y="214" fill="#2c4720" font-size="28">When is electricity cheap and clean?</text>
  <rect x="${band.left}" y="${chart.top - 8}" width="${band.width}" height="${chart.bottom - chart.top + 8}" fill="#ffd23f" opacity="0.55"/>
  <rect x="${band.left + band.width / 2 - 34}" y="${chart.top - 46}" width="68" height="32" rx="16" fill="#ffd23f"/>
  <text x="${band.left + band.width / 2}" y="${chart.top - 23}" fill="#2c2e2a" font-size="18" font-weight="700" text-anchor="middle">2 h</text>
  <line x1="${chart.left}" x2="${chart.right}" y1="${chart.bottom}" y2="${chart.bottom}" stroke="#c4bca2" stroke-width="2"/>
  <path d="${area}" fill="#4fa6e3" opacity="0.2"/>
  <path d="${line}" fill="none" stroke="#1d5f9a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="${chart.left}" y="${HEIGHT - 30}" fill="#57584f" font-size="24">Day-ahead · ct/kWh · Bundesnetzagentur | SMARD.de</text>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const output = join(root, "public", "og.png");
await page.screenshot({ path: output, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();
console.log(`wrote ${output}`);
