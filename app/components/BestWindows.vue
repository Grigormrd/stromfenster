<script setup lang="ts">
import type { Dashboard } from "#shared/utils/dashboard";

/**
 * The answer the page exists for: when to run something for a chosen number
 * of hours. Every duration is in the HTML; the radio buttons pick which one
 * is shown, by CSS alone (see main.css).
 */
const props = defineProps<{ dashboard: Dashboard }>();

const { t } = useI18n();
const format = useFormatters();

const entries = computed(() =>
  props.dashboard.recommendations.map(({ duration, cheapest, cleanest }) => {
    const describe = (window: NonNullable<typeof cheapest>) =>
      describeWindow(props.dashboard.timeline, window, props.dashboard.todaySlots, format.value, t);
    return {
      duration,
      cheapest: cheapest && {
        when: describe(cheapest),
        value: format.value.price(cheapest.average),
      },
      cleanest: cleanest && {
        when: describe(cleanest),
        value: format.value.share(cleanest.average),
      },
    };
  }),
);
</script>

<template>
  <section class="card best" aria-labelledby="best-heading">
    <h2 id="best-heading">{{ t("best.heading") }}</h2>

    <fieldset class="durations">
      <legend>{{ t("best.runsFor") }}</legend>
      <template v-for="duration in DURATIONS" :key="duration">
        <input
          :id="`duration-${duration}`"
          type="radio"
          name="duration"
          :value="duration"
          :checked="duration === 2"
        />
        <label :for="`duration-${duration}`">{{ t("best.hours", { n: duration }) }}</label>
      </template>
    </fieldset>

    <div v-for="entry in entries" :key="entry.duration" :data-duration="entry.duration">
      <div class="answers">
        <div class="answer">
          <h3>{{ t("best.cheapest") }}</h3>
          <template v-if="entry.cheapest">
            <p class="when">{{ entry.cheapest.when }}</p>
            <p class="secondary">
              {{ t("best.onAverage", { price: entry.cheapest.value })
              }}<template v-if="dashboard.currentPrice !== null">
                · {{ t("best.now", { price: format.price(dashboard.currentPrice) }) }}</template
              >
            </p>
          </template>
          <p v-else class="secondary">{{ t("best.nonePrice", { n: entry.duration }) }}</p>
        </div>

        <div class="answer">
          <h3>{{ t("best.cleanest") }}</h3>
          <template v-if="entry.cleanest">
            <p class="when">{{ entry.cleanest.when }}</p>
            <p class="secondary">{{ t("best.ofUse", { share: entry.cleanest.value }) }}</p>
          </template>
          <p v-else class="secondary">{{ t("best.noneForecast", { n: entry.duration }) }}</p>
        </div>
      </div>
    </div>

    <p v-if="!dashboard.hasTomorrow" class="secondary note">{{ t("best.tomorrowNote") }}</p>
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
