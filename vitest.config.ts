import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Pure logic: no Nuxt, no DOM.
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // The pipeline Worker in workerd with a real D1 database.
        test: {
          name: "worker",
          include: ["test/worker/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
      {
        // The built website, started as a server: what a browser without
        // JavaScript receives. Needs a build.
        test: {
          name: "site",
          include: ["test/site/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
      // Components and pages inside a Nuxt runtime. The data API is replaced
      // by endpoints the tests register, and the page is rendered for the
      // moment the fixtures were recorded.
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.test.ts"],
          environment: "nuxt",
          environmentOptions: {
            nuxt: {
              overrides: {
                runtimeConfig: {
                  public: { dataApiUrl: "", fixedNow: "2026-11-14T20:30:46Z" },
                },
              },
            },
          },
        },
      }),
    ],
  },
});
