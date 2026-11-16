<script setup lang="ts">
const { t, locale } = useI18n();
const localePath = useLocalePath();

usePageMeta({
  title: () => t("methodology.title"),
  description: () => t("methodology.description"),
});
</script>

<template>
  <main class="prose">
    <p class="back">
      <NuxtLink :to="localePath('index')">{{ t("nav.home") }}</NuxtLink>
    </p>

    <MethodologyProseDe v-if="locale === 'de'" />
    <MethodologyProseEn v-else />

    <footer class="secondary">
      <p>
        {{ t("footer.data") }}
        <a href="https://www.smard.de">Bundesnetzagentur | SMARD.de</a>,
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
        · <LanguageSwitch />
      </p>
    </footer>
  </main>
</template>
