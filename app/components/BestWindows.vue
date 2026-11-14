<script setup lang="ts">
import type { Dashboard } from "#shared/utils/dashboard";

/**
 * The answer the page exists for: when to run something for a chosen number
 * of hours. Every duration is in the HTML; the radio buttons pick which one
 * is shown, by CSS alone (see main.css).
 */
const props = defineProps<{ dashboard: Dashboard }>();

const entries = computed(() =>
  props.dashboard.recommendations.map(({ duration, cheapest, cleanest }) => ({
    duration,
    cheapest: cheapest && {
      when: describeWindow(props.dashboard.timeline, cheapest, props.dashboard.todaySlots),
      value: formatPrice(cheapest.average),
    },
    cleanest: cleanest && {
      when: describeWindow(props.dashboard.timeline, cleanest, props.dashboard.todaySlots),
      value: formatShare(cleanest.average),
    },
  })),
);
</script>

<template>
  <section class="card best" aria-labelledby="best-heading">
    <h2 id="best-heading">When should I run it?</h2>

    <fieldset class="durations">
      <legend>It runs for</legend>
      <template v-for="duration in DURATIONS" :key="duration">
        <input
          :id="`duration-${duration}`"
          type="radio"
          name="duration"
          :value="duration"
          :checked="duration === 2"
        />
        <label :for="`duration-${duration}`">{{ duration }} h</label>
      </template>
    </fieldset>

    <div v-for="entry in entries" :key="entry.duration" :data-duration="entry.duration">
      <div class="answers">
        <div class="answer">
          <h3>Cheapest</h3>
          <template v-if="entry.cheapest">
            <p class="when">{{ entry.cheapest.when }}</p>
            <p class="secondary">
              {{ entry.cheapest.value }} on average<template v-if="dashboard.currentPrice !== null">
                · now {{ formatPrice(dashboard.currentPrice) }}</template
              >
            </p>
          </template>
          <p v-else class="secondary">
            No window of {{ entry.duration }} h is left in the prices published so far.
          </p>
        </div>

        <div class="answer">
          <h3>Most wind and solar</h3>
          <template v-if="entry.cleanest">
            <p class="when">{{ entry.cleanest.when }}</p>
            <p class="secondary">{{ entry.cleanest.value }} of electricity use, expected</p>
          </template>
          <p v-else class="secondary">
            No window of {{ entry.duration }} h is left in the forecasts published so far.
          </p>
        </div>
      </div>
    </div>

    <p v-if="!dashboard.hasTomorrow" class="secondary note">
      Tomorrow's prices are published around 13:00. Until then the cheapest window is within today.
    </p>
  </section>
</template>

<style scoped>
h2 {
  font-size: 1.125rem;
}

.durations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0.75rem 0 1rem;
  padding: 0;
  border: 0;
}

legend {
  float: left;
  margin-right: 0.25rem;
  padding: 0;
  color: var(--ink-secondary);
}

/* The radio stays in the page for keyboard and screen readers; the label is what is seen. */
input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

label {
  min-width: 3rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--axis);
  border-radius: 999px;
  text-align: center;
  cursor: pointer;
}

input:checked + label {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--surface);
}

input:focus-visible + label {
  outline: 2px solid var(--price);
  outline-offset: 2px;
}

.answers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem 2rem;
}

h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.when {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.25;
}

.note {
  margin-top: 1rem;
  font-size: 0.875rem;
}
</style>
