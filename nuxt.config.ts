// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync } from "node:fs";
import { join } from "node:path";

// Time series are arrays indexed by position; an index that may be out of range
// should be `undefined` in the types as well.
const compilerOptions = { noUncheckedIndexedAccess: true };

export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  devtools: { enabled: true },

  modules: ["@nuxt/eslint"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // Where the import reads from. Tests point this at recorded responses
    // (NUXT_SMARD_BASE_URL).
    smardBaseUrl: "https://www.smard.de/app/chart_data",
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
    },
  },

  typescript: {
    strict: true,
    tsConfig: { compilerOptions },
    sharedTsConfig: { compilerOptions },
    // Paths are relative to .nuxt, where the generated tsconfig files live.
    nodeTsConfig: {
      compilerOptions,
      include: [
        "../vitest.config.ts",
        "../scripts/**/*",
        "../test/fixtures/**/*.ts",
        "../test/worker/**/*",
      ],
    },
  },

  // The app runs as a single Cloudflare Worker (see docs/adr/0001). Bindings
  // and the Cron Trigger are declared in wrangler.jsonc.
  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    experimental: { tasks: true },
    typescript: {
      // Unit tests cover server-side logic, so they are type-checked with it.
      tsConfig: { compilerOptions, include: ["../test/unit/**/*"] },
    },
  },

  hooks: {
    // The generated Wrangler configuration lives next to the built Worker and
    // refers to the migrations relative to itself, so they ship with the build.
    "nitro:init"(nitro) {
      nitro.hooks.hook("compiled", () => {
        cpSync(
          join(nitro.options.rootDir, "migrations"),
          join(nitro.options.output.serverDir, "migrations"),
          { recursive: true },
        );
      });
    },
  },

  // Prettier owns formatting; ESLint only reports code problems.
  eslint: {
    config: { stylistic: false },
  },
});
