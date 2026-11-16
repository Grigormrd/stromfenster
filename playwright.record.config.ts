import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/**
 * Records the animated preview in the README (`pnpm record-demo`): the same
 * build, recorded data and fixed clock as the end-to-end tests, but it only
 * runs `*.record.ts` files, in one desktop browser.
 */
export default defineConfig({
  ...base,
  testMatch: "**/*.record.ts",
  projects: [{ name: "record", use: { ...devices["Desktop Chrome"] } }],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
});
