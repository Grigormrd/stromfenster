<script setup lang="ts">
// The language of the document, the canonical link and the hreflang
// alternates of every page come from the i18n module.
const head = useLocaleHead();

useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link: head.value.link,
  meta: head.value.meta,
}));
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
