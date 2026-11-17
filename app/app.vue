<script setup lang="ts">
// The language of the document, the canonical link and the hreflang
// alternates of every page come from the i18n module.
const head = useLocaleHead();

useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link: [
    // The one font file every page needs; fetched before the stylesheet asks for it.
    {
      rel: "preload",
      href: "/fonts/hanken-grotesk-latin.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous",
    },
    ...head.value.link,
  ],
  meta: head.value.meta,
}));
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
