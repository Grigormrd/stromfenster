/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { openHydrated } from "./helpers";

/*
 * Records docs/media/stromfenster-demo.gif: choosing a duration, reading the
 * charts, switching to English. Run with `pnpm build && pnpm record-demo`
 * (needs ffmpeg on the PATH). Not part of the test suite; it uses the test
 * setup to film the same evening every time.
 */

const SIZE = { width: 1100, height: 720 };
const OUTPUT = join(import.meta.dirname, "..", "..", "docs", "media", "stromfenster-demo.gif");

/** Headless browsers draw no mouse pointer, so draw one for the video. */
function showPointer() {
  window.addEventListener("DOMContentLoaded", () => {
    const pointer = document.createElement("div");
    pointer.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M2 1l14 8-6 2-3 6z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(pointer.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "2147483647",
      pointerEvents: "none",
      transform: "translate(-50px, -50px)",
    });
    document.body.append(pointer);
    document.addEventListener(
      "mousemove",
      (event) => {
        pointer.style.transform = `translate(${event.clientX - 2}px, ${event.clientY - 1}px)`;
      },
      true,
    );
  });
}

// Starts in the margin to the right of the page, away from the charts.
let pointerAt = { x: SIZE.width - 40, y: 300 };

async function glide(page: Page, to: { x: number; y: number }, steps = 25) {
  await page.mouse.move(to.x, to.y, { steps });
  pointerAt = to;
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Scrolls smoothly so the element's top sits a little below the window's top. */
async function scrollTo(page: Page, locator: Locator, offset = 24) {
  await locator.evaluate(
    (element, gap) =>
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - gap,
        behavior: "smooth",
      }),
    offset,
  );
  await page.waitForTimeout(1100);
  // Moving the page under a still pointer would not update the hover.
  await page.mouse.move(pointerAt.x, pointerAt.y);
}

/** Sweeps the pointer across a chart from left to right, so the tooltip follows. */
async function sweep(page: Page, chart: Locator, from: number, to: number, steps: number) {
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart not visible");
  const y = box.y + box.height * 0.55;
  await glide(page, { x: box.x + box.width * from, y }, 20);
  await page.waitForTimeout(300);
  await glide(page, { x: box.x + box.width * to, y }, steps);
}

test("record the README preview", async ({ browser }) => {
  const dir = mkdtempSync(join(tmpdir(), "stromfenster-recording-"));
  const context = await browser.newContext({
    viewport: SIZE,
    colorScheme: "light",
    recordVideo: { dir, size: SIZE },
  });
  await context.addInitScript(showPointer);
  const page = await context.newPage();
  const startedAt = Date.now();

  await openHydrated(page, "/");
  await page.mouse.move(pointerAt.x, pointerAt.y);
  const showStart = Date.now();
  await page.waitForTimeout(1200);

  // 1. Choose a longer run; the recommendation and the band in the chart follow.
  for (const label of ["3 Std.", "4 Std."]) {
    const option = page.getByText(label, { exact: true });
    await glide(page, await center(option), 25);
    await option.click();
    await page.waitForTimeout(900);
  }

  // 2. Read the price chart.
  const price = page.locator("figure").filter({ hasText: "Preis" }).first();
  await scrollTo(page, price);
  await sweep(page, price.locator("svg:visible").first(), 0.08, 0.92, 70);
  await page.waitForTimeout(500);

  // 3. The generation of today, with its CO₂ estimate.
  const generation = page.locator("figure").filter({ hasText: "Erzeugung heute" });
  await scrollTo(page, generation);
  await sweep(page, generation.locator("svg:visible").first(), 0.1, 0.8, 50);
  await page.waitForTimeout(500);

  // 4. Switch to English.
  const english = page.getByRole("link", { name: "English" });
  await scrollTo(page, english, 500);
  await glide(page, await center(english), 25);
  await english.click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(/When/);
  await page.waitForTimeout(2200);
  const showEnd = Date.now();

  await context.close();
  const video = await page.video()?.path();
  if (!video) throw new Error("no video recorded");

  // Trimmed to the part on camera, as a looping GIF.
  const seconds = (ms: number) => (ms / 1000).toFixed(2);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...["-ss", seconds(showStart - startedAt), "-i", video],
      ...["-t", seconds(showEnd - showStart)],
      "-filter_complex",
      [
        "[0:v]fps=8,scale=800:-1:flags=lanczos,split[a][b]",
        "[a]palettegen=max_colors=64:stats_mode=diff[p]",
        "[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
      ].join(";"),
      OUTPUT,
    ],
    { stdio: "inherit" },
  );
});
