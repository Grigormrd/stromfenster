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
    }
  : { home: "/", yesterday: `/tag/${yesterday}`, methodology: "/methodik" };

useHead({
  htmlAttrs: { lang: english ? "en-GB" : "de-DE" },
  title: `${title} · Stromfenster`,
  meta: [{ name: "robots", content: "noindex" }],
});
</script>

<template>
  <main class="prose error-page">
    <p class="secondary">{{ say("errors.code", { code: error.statusCode }) }}</p>
    <h1>{{ title }}</h1>
    <p class="lead secondary">
      {{ say(notFound ? "errors.notFoundText" : "errors.otherText") }}
    </p>
    <ul>
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
.error-page {
  padding-top: 4rem;
}
</style>
