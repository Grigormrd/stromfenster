<script setup lang="ts">
const { t, locale } = useI18n();

usePageMeta({
  title: () => t("methodology.title"),
  description: () => t("methodology.description"),
});
</script>

<template>
  <main class="prose">
    <LandHeader>
      <template v-if="locale === 'de'">
        <h1>So werden die Zahlen berechnet</h1>
        <p class="lead">
          Was gemessen ist, was geschätzt ist, was fehlt und woher jede Zahl stammt.
        </p>
      </template>
      <template v-else>
        <h1>How the figures are calculated</h1>
        <p class="lead">
          What is measured, what is estimated, what is left out, and where each number comes from.
        </p>
      </template>
    </LandHeader>

    <MethodologyProseDe v-if="locale === 'de'" />
    <MethodologyProseEn v-else />

    <footer class="site-footer secondary">
      <p>
        {{ t("footer.data") }}
        <a href="https://www.smard.de">Bundesnetzagentur | SMARD.de</a>,
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
      </p>
    </footer>
  </main>
</template>
