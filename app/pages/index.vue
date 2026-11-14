<script setup lang="ts">
const description =
  "Stromfenster shows when electricity in Germany is cheap and clean, based on day-ahead prices and the generation mix.";

useSeoMeta({
  title: "Stromfenster: when is electricity cheap and clean?",
  description,
});
</script>

<template>
  <main class="page">
    <h1>Stromfenster</h1>
    <p class="lead">When is electricity in Germany cheap and clean?</p>
    <p>
      A dashboard built on public data from the German electricity market: day-ahead prices, the
      generation mix and the best time window for running an appliance.
    </p>
    <p class="status">Under construction. The data pipeline and the charts come next.</p>
  </main>
</template>

<style scoped>
.page {
  max-width: 40rem;
  margin: 0 auto;
  padding: 4rem 1rem;
}

h1 {
  margin: 0;
  font-size: 2.5rem;
  line-height: 1.1;
}

.lead {
  margin: 0.5rem 0 1.5rem;
  font-size: 1.25rem;
}

.status {
  color: var(--color-muted);
}
</style>
