<script setup lang="ts">
import type { NuxtError } from "#app";

/**
 * Shown for any error, most often an address that does not exist. It
 * replaces the whole app, so it sets its own language and title. The
 * language comes from the address: everything under /en is English.
 */
const props = defineProps<{ error: NuxtError }>();

const route = useRoute();
const { t } = useI18n();
const english = route.path === "/en" || route.path.startsWith("/en/");
const locale = english ? "en" : "de";
const say = (key: string, values: Record<string, unknown> = {}) => t(key, values, { locale });

const notFound = props.error.statusCode === 404;
const title = say(notFound ? "errors.notFoundTitle" : "errors.otherTitle");

const now = Math.floor(Date.now() / 1000);
const yesterday = addDays(berlinDateKey(now), -1);
const links = english
  ? {
      home: "/en",
      yesterday: `/en/day/${yesterday}`,
      methodology: "/en/methodology",
      // The other language's start page: the missing address has no counterpart.
      other: "/",
    }
  : { home: "/", yesterday: `/tag/${yesterday}`, methodology: "/methodik", other: "/en" };
const otherLanguage = english ? "de-DE" : "en-GB";

useHead({
  htmlAttrs: { lang: english ? "en-GB" : "de-DE" },
  title: `${title} · Stromfenster`,
  meta: [{ name: "robots", content: "noindex" }],
});
</script>

<template>
  <main class="prose error-page">
    <LandHeader :home-href="links.home" :nav-label="say('nav.label')">
      <template #nav>
        <a :href="links.other" :lang="otherLanguage" :hreflang="otherLanguage">{{
          say("nav.switchLanguage")
        }}</a>
      </template>
      <h1>{{ title }}</h1>
      <p class="lead">
        {{ say("errors.code", { code: error.statusCode }) }}:
        {{ say(notFound ? "errors.notFoundText" : "errors.otherText") }}
      </p>
    </LandHeader>
    <ul class="ways">
      <li>
        <a :href="links.home">{{ say("errors.home") }}</a>
      </li>
      <li v-if="notFound">
        <a :href="links.yesterday">{{ say("errors.yesterday") }}</a>
      </li>
      <li v-if="notFound">
        <a :href="links.methodology">{{ say("errors.methodology") }}</a>
      </li>
    </ul>
  </main>
</template>

<style scoped>
/* The ways back, as outlined capsules on the water. */
.ways {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  padding: 0;
  list-style: none;
}

.ways li + li {
  margin-top: 0;
}

.ways a {
  display: inline-block;
  padding: 0.5rem 1.15rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
}

@media (hover: hover) {
  .ways a:hover {
    background: var(--ink);
    color: var(--water);
  }
}
</style>
