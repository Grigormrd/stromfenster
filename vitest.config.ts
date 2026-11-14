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
