// https://nuxt.com/docs/api/configuration/nuxt-config

// Time series are arrays indexed by position; an index that may be out of range
// should be `undefined` in the types as well.
const compilerOptions = { noUncheckedIndexedAccess: true };

// The website. It is deployed to Vercel, which needs no preset or adapter
// here. The data pipeline is a separate Cloudflare Worker in worker/
// (see docs/adr/0004).
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

  // Prettier owns formatting; ESLint only reports code problems.
  eslint: {
    config: { stylistic: false },
  },
});
