import { expect, test } from "@playwright/test";
import { openHydrated } from "./helpers";

// The pages are rendered for 14 November 2026, 21:30 in Berlin (see
// playwright.config.ts), with data recorded at that moment.

test.describe("choosing the duration", () => {
  test("works without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator('section.best [data-duration="2"] .when').first()).toBeVisible();
    await expect(page.locator('section.best [data-duration="3"] .when').first()).toBeHidden();

    await page.getByText("3 Std.", { exact: true }).click();

    await expect(page.locator('section.best [data-duration="3"] .when').first()).toBeVisible();
    await expect(page.locator('section.best [data-duration="2"] .when').first()).toBeHidden();
    await context.close();
  });

  test("works with the arrow keys", async ({ page }) => {
    await openHydrated(page, "/");
    await page.locator("#duration-2").focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.locator("#duration-3")).toBeChecked();
    await expect(page.locator('section.best [data-duration="3"] .when').first()).toBeVisible();
  });
});

test.describe("reading a chart with the keyboard", () => {
  test("moves a marker and reads the value out", async ({ page }) => {
    await openHydrated(page, "/");
    const chart = page.locator("figure").first().locator("svg:visible");

    // Tab onto the chart, as a keyboard user would.
    await page.locator("figure").first().locator("summary").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(chart).toBeFocused();

    // The marker starts at the current quarter hour.
    const live = page.locator("figure").first().locator('[aria-live="polite"]');
    await expect(live.filter({ hasText: "Heute 21:30–21:45" })).toHaveCount(1);

    await page.keyboard.press("ArrowRight");
    await expect(live.filter({ hasText: "Heute 21:45–22:00" })).toHaveCount(1);

    await page.keyboard.press("End");
    await expect(live.filter({ hasText: /^Morgen 23:45–00:00: \d+,\d ct\/kWh$/ })).toHaveCount(1);
    await expect(page.locator("figure").first().locator(".tooltip")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("figure").first().locator(".tooltip")).toHaveCount(0);
  });

  test("reads the generation of a quarter hour", async ({ page }) => {
    await openHydrated(page, "/tag/2026-11-13");
    const figure = page.locator("figure").nth(1);
    await figure.locator("summary").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Home");

    await expect(
      figure.locator('[aria-live="polite"]').filter({ hasText: /^00:00–00:15: Sonne \d+,\d GW/ }),
    ).toHaveCount(1);
  });
});

test.describe("moving around", () => {
  test("switches to English and back", async ({ page }) => {
    await openHydrated(page, "/");
    await page.getByRole("link", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator(".lead")).toHaveText(
      "When is electricity in Germany cheap and clean?",
    );

    await page.getByRole("link", { name: "Deutsch" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });

  test("goes from the start page to yesterday and on to the next day", async ({ page }) => {
    await openHydrated(page, "/");
    await page.getByRole("link", { name: "gestern" }).click();

    await expect(page).toHaveURL(/\/tag\/2026-11-13$/);
    await expect(page.locator("h1")).toHaveText("Strom am Freitag, 13. November 2026");

    // Rendered in the browser this time: the page fetches the day itself.
    await page.locator('nav a[rel="next"]').click();
    await expect(page).toHaveURL(/\/tag\/2026-11-14$/);
    await expect(page.locator("h1")).toHaveText("Strom am Samstag, 14. November 2026");
    await expect(page.locator(".figures")).toContainText("Niedrigster Preis");
  });

  test("explains the figures on the methodology page", async ({ page }) => {
    await openHydrated(page, "/");
    await page.getByRole("link", { name: "So wird geschätzt" }).click();

    await expect(page).toHaveURL(/\/methodik#co2$/);
    await expect(page.locator("h1")).toHaveText("So werden die Zahlen berechnet");
  });

  test("shows its own page for an address that does not exist", async ({ page }) => {
    const response = await page.goto("/gibt-es-nicht");

    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Seite nicht gefunden");
    await page.getByRole("link", { name: "Zur Startseite" }).click();
    await expect(page.locator(".lead")).toHaveText(
      "Wann ist Strom in Deutschland günstig und sauber?",
    );
  });

  test("shows the not-found page in English under /en", async ({ page }) => {
    const response = await page.goto("/en/nothing-here");

    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Page not found");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  });
});

test.describe("hovering a chart", () => {
  test.skip(({ isMobile }) => isMobile, "There is no pointer to hover with on a phone.");

  test("shows the value under the pointer", async ({ page }) => {
    await openHydrated(page, "/");
    const chart = page.locator("figure").first().locator("svg:visible");
    const box = (await chart.boundingBox())!;

    // hover() scrolls the chart into view first; the first chart is below the fold.
    await chart.hover({ position: { x: box.width * 0.3, y: box.height * 0.6 } });

    const tooltip = page.locator("figure").first().locator(".tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Heute \d\d:\d\d–\d\d:\d\d/);
    await expect(tooltip).toContainText("ct/kWh");
  });
});
