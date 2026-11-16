import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the production build (`pnpm build`), with the
// data API replaced by recorded responses and the clock set to the moment
// they were recorded, so every run sees the same pages.
const API_PORT = 4310;
const SITE_PORT = 4300;
const RECORDED_AT = "2026-11-14T20:30:46Z";

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${SITE_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `node test/e2e/fixture-api.ts ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: "node .output/server/index.mjs",
      url: `http://127.0.0.1:${SITE_PORT}/robots.txt`,
      reuseExistingServer: false,
      env: {
        PORT: String(SITE_PORT),
        HOST: "127.0.0.1",
        NUXT_PUBLIC_DATA_API_URL: `http://127.0.0.1:${API_PORT}`,
        NUXT_PUBLIC_FIXED_NOW: RECORDED_AT,
      },
    },
  ],
});
