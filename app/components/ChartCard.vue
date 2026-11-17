<script setup lang="ts">
/**
 * A chart with its title, legend and table view.
 *
 * The chart is drawn twice, once for wide and once for narrow containers, and
 * a container query shows the one that fits. Scaling a single drawing would
 * shrink its labels to half their size on a phone. Both drawings are in the
 * server's HTML, so this needs no JavaScript.
 */
defineProps<{
  title: string;
  subtitle: string;
  /** Text of the control that opens the table. */
  tableLabel: string;
}>();

const WIDE = { width: 720, height: 280 };
const NARROW = { width: 380, height: 250 };
</script>

<template>
  <figure class="card figure">
    <figcaption>
      <h2>{{ title }}</h2>
      <p class="secondary">{{ subtitle }}</p>
    </figcaption>

    <slot name="legend" />

    <div class="wide"><slot v-bind="WIDE" /></div>
    <div class="narrow"><slot v-bind="NARROW" /></div>

    <details class="table-view">
      <summary>{{ tableLabel }}</summary>
      <div class="table-scroll" tabindex="0" role="region" :aria-label="tableLabel">
        <slot name="table" />
      </div>
    </details>
  </figure>
</template>

<style scoped>
.figure {
  margin-block: 0;
  container-type: inline-size;
}

figcaption {
  margin-bottom: 1.25rem;
}

h2 {
  font-size: 1.5rem;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

figcaption p {
  margin-top: 0.25rem;
  font-size: 0.9375rem;
}

.narrow {
  display: none;
}

@container (max-width: 34rem) {
  .wide {
    display: none;
  }

  .narrow {
    display: block;
  }
}

.table-view {
  margin-top: 1.25rem;
  font-size: 0.875rem;
}

/* The table toggle: an outlined capsule whose chevron turns when it opens. */
summary {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  width: fit-content;
  padding: 0.35rem 1rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-weight: 700;
  list-style: none;
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none;
}

summary::after {
  content: "";
  width: 0.45rem;
  height: 0.45rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  rotate: 45deg;
  translate: 0 -0.12rem;
  transition: rotate 0.4s var(--ease-swell);
}

/* Only where there is a real pointer: on touch screens a tap would leave it filled. */
@media (hover: hover) {
  summary:hover {
    background: var(--ink);
    color: var(--surface);
  }
}

details[open] summary::after {
  rotate: 225deg;
  translate: 0 0.1rem;
}

.table-scroll {
  overflow-x: auto;
  margin-top: 0.75rem;
}

.table-view :deep(table) {
  border-collapse: collapse;
}

.table-view :deep(caption) {
  padding-bottom: 0.4rem;
  color: var(--ink-secondary);
  text-align: left;
}

.table-view :deep(th),
.table-view :deep(td) {
  padding: 0.3rem 1.25rem 0.3rem 0;
  border-bottom: 1px solid var(--grid);
  text-align: right;
  white-space: nowrap;
}

.table-view :deep(th:first-child),
.table-view :deep(td:first-child) {
  text-align: left;
}

.table-view :deep(thead th) {
  color: var(--ink-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
