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
      <div class="table-scroll"><slot name="table" /></div>
    </details>
  </figure>
</template>

<style scoped>
.figure {
  margin: 0;
  container-type: inline-size;
}

figcaption {
  margin-bottom: 0.75rem;
}

h2 {
  font-size: 1.125rem;
  line-height: 1.3;
}

figcaption p {
  font-size: 0.875rem;
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
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

summary {
  width: fit-content;
  padding: 0.25rem 0;
  color: var(--ink-secondary);
  cursor: pointer;
}

.table-scroll {
  overflow-x: auto;
  margin-top: 0.5rem;
}

.table-view :deep(table) {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.table-view :deep(caption) {
  text-align: left;
  color: var(--ink-secondary);
  padding-bottom: 0.25rem;
}

.table-view :deep(th),
.table-view :deep(td) {
  padding: 0.2rem 1rem 0.2rem 0;
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
  font-weight: 600;
}
</style>
