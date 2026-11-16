import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// WCAG 2.1 A and AA, on every kind of page, in light and dark mode.
const PAGES = [
  "/",
  "/en",
  "/methodik",
  "/en/methodology",
  "/tag/2026-11-13",
  "/en/day/2026-11-13",
  "/tag/2026-11-15",
  "/gibt-es-nicht",
  "/en/does-not-exist",
];

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // A readable summary in the failure message instead of a wall of JSON.
  return result.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 5),
  }));
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PAGES) {
      test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(path);
        expect(await violations(page)).toEqual([]);
      });
    }

    test("the tables under the charts have no violations when they are open", async ({ page }) => {
      for (const path of ["/", "/tag/2026-11-13"]) {
        await page.goto(path);
        for (const summary of await page.locator("details summary:visible").all()) {
          await summary.click();
        }
        expect(await violations(page), path).toEqual([]);
      }
    });
  });
}
