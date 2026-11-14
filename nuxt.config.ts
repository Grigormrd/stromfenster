// https://nuxt.com/docs/api/configuration/nuxt-config

// Time series are arrays indexed by position; an index that may be out of range
// should be `undefined` in the types as well.
const compilerOptions = { noUncheckedIndexedAccess: true };

export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  devtools: { enabled: true },

  modules: ["@nuxt/eslint"],

  css: ["~/assets/css/main.css"],

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
    nodeTsConfig: { compilerOptions, include: ["../vitest.config.ts"] },
  },

  // The app runs as a single Cloudflare Worker (see docs/adr/0001).
  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: { name: "stromfenster" },
    },
    typescript: {
      // Unit tests cover server-side logic, so they are type-checked with it.
      tsConfig: { compilerOptions, include: ["../test/unit/**/*"] },
    },
  },

  // Prettier owns formatting; ESLint only reports code problems.
  eslint: {
    config: { stylistic: false },
  },
});
