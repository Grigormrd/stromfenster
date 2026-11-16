/// <reference lib="dom" />
import type { Page } from "@playwright/test";

/**
 * Opens a page and waits until Vue has taken over the server's HTML. Before
 * that, the page is readable but does not react to the mouse or the keys
 * that JavaScript handles.
 */
export async function openHydrated(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForFunction(() =>
    Boolean((document.querySelector("#__nuxt") as { __vue_app__?: unknown } | null)?.__vue_app__),
  );
  return response;
}
