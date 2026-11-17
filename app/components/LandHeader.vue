<script setup lang="ts">
/**
 * The green area of land at the top of every page: the name, the navigation
 * and the page's answer. Its lower edge is a coastline drawn as one SVG path,
 * a deep lobe on the left and a shallow cove on the right. On the start page
 * the name is the page's only top-level heading; elsewhere it links home.
 *
 * The error page passes its own home address, navigation and label, because
 * it works out the language from the address itself.
 */
withDefaults(defineProps<{ home?: boolean; homeHref?: string; navLabel?: string }>(), {
  homeHref: undefined,
  navLabel: undefined,
});

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div class="land">
    <div class="land-inner">
      <div class="bar">
        <h1 v-if="home" class="wordmark">Stromfenster</h1>
        <p v-else class="wordmark back">
          <NuxtLink :to="homeHref ?? localePath('index')">Stromfenster</NuxtLink>
        </p>
        <nav :aria-label="navLabel ?? t('nav.label')">
          <slot name="nav">
            <NuxtLink :to="localePath('methodology')">{{ t("nav.methodologyShort") }}</NuxtLink>
            <LanguageSwitch />
          </slot>
        </nav>
      </div>
      <slot />
    </div>
    <svg
      class="coast"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 0H1440V8C1384 16 1322 20 1250 17C1150 13 1070 6 980 12C880 19 820 40 730 58C640 76 560 98 450 99C340 100 270 82 200 78C130 74 60 88 0 96Z"
      />
    </svg>
  </div>
</template>

<style scoped>
.land {
  --focus: var(--on-land);
  /* The coastline hangs below the land; its full depth is kept free, plus a gap. */
  --coast: clamp(1.75rem, 4.5vw, 4rem);
  position: relative;
  margin-bottom: calc(var(--coast) + clamp(1.25rem, 3vw, 1.5rem));
  background: var(--land);
  color: var(--on-land);
}

.land-inner {
  width: min(var(--page), 100% - 2 * var(--gutter));
  margin-inline: auto;
  padding: 1.25rem 0 clamp(1rem, 2.5vw, 1.5rem);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  margin-bottom: clamp(1.75rem, 4.5vw, 2rem);
}

.wordmark {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.wordmark a {
  text-decoration: none;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* The navigation as outlined capsules, like the secondary buttons of a guide map. */
nav :deep(a) {
  padding: 0.3rem 0.95rem;
  border: 2px solid var(--on-land);
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s;
}

nav :deep(a[aria-current="page"]) {
  background: var(--on-land);
  color: var(--land);
}

@media (hover: hover) {
  nav :deep(a:hover) {
    background: var(--on-land);
    color: var(--land);
  }
}

/* The coastline: hangs below the land, drawn in the land's own colour. */
.coast {
  position: absolute;
  top: calc(100% - 1px);
  left: 0;
  width: 100%;
  height: var(--coast);
  fill: var(--land);
}

@media (forced-colors: active) {
  .land {
    border-bottom: 1px solid CanvasText;
  }

  .coast {
    display: none;
  }
}
</style>
