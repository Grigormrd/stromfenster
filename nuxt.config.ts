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

  modules: ["@nuxt/eslint", "@nuxtjs/i18n"],

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      // The pipeline's API (NUXT_PUBLIC_DATA_API_URL). The default is the
      // deployed Worker, so the site runs locally without the pipeline.
      dataApiUrl: "https://stromfenster.plan-werk.workers.dev",
      // An ISO 8601 time to render the page for, instead of the current time
      // (NUXT_PUBLIC_FIXED_NOW). For tests against recorded data only.
      fixedNow: "",
    },
  },

  // German at the root, English under /en (see docs/adr/0008).
  i18n: {
    defaultLocale: "de",
    strategy: "prefix_except_default",
    // No redirect by browser language: a cached page must be the same for
    // everyone, and a link should open in the language it was shared in.
    detectBrowserLanguage: false,
    // Used for canonical and hreflang links (NUXT_PUBLIC_I18N_BASE_URL).
    baseUrl: "https://stromfenster.vercel.app",
    locales: [
      { code: "de", language: "de-DE", name: "Deutsch", file: "de.json" },
      { code: "en", language: "en-GB", name: "English", file: "en.json" },
    ],
    customRoutes: "config",
    pages: {
      methodology: { de: "/methodik", en: "/methodology" },
    },
  },

  routeRules: {
    // Rendered on the server, cached by Vercel, and rendered again in the
    // background at most every five minutes.
    "/": { isr: 300 },
    "/en": { isr: 300 },
    // Text and tables that only change with a deployment.
    "/methodik": { prerender: true },
    "/en/methodology": { prerender: true },
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
