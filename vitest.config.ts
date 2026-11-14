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
        // The built Worker in workerd with a real D1 database. Needs a build.
        test: {
          name: "worker",
          include: ["test/worker/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
      // Components and composables inside a Nuxt runtime.
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.test.ts"],
          environment: "nuxt",
        },
      }),
    ],
  },
});
