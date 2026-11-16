<script setup lang="ts">
/** A link to the same page in the other language. */
const { locale, locales, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const other = computed(() => locales.value.find((entry) => entry.code !== locale.value)!);
</script>

<template>
  <NuxtLink :to="switchLocalePath(other.code)" :lang="other.language" :hreflang="other.language">{{
    t("nav.switchLanguage")
  }}</NuxtLink>
</template>
