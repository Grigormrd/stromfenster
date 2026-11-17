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
  <section class="best" aria-labelledby="best-heading">
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
          <h3 class="capsule">{{ t("best.cheapest") }}</h3>
          <template v-if="entry.cheapest">
            <p class="when">{{ entry.cheapest.when }}</p>
            <p class="quiet">
              {{ t("best.onAverage", { price: entry.cheapest.value })
              }}<template v-if="dashboard.currentPrice !== null">
                · {{ t("best.now", { price: format.price(dashboard.currentPrice) }) }}</template
              >
            </p>
          </template>
          <p v-else class="quiet">{{ t("best.nonePrice", { n: entry.duration }) }}</p>
        </div>

        <div class="answer">
          <h3 class="capsule capsule--pond">{{ t("best.cleanest") }}</h3>
          <template v-if="entry.cleanest">
            <p class="when">{{ entry.cleanest.when }}</p>
            <p class="quiet">{{ t("best.ofUse", { share: entry.cleanest.value }) }}</p>
          </template>
          <p v-else class="quiet">{{ t("best.noneForecast", { n: entry.duration }) }}</p>
        </div>
      </div>
    </div>

    <p v-if="!dashboard.hasTomorrow" class="quiet note">{{ t("best.tomorrowNote") }}</p>
  </section>
</template>

<style scoped>
/* Sits on the land: ink on green, capsules for labels and the choice. */
h2 {
  font-size: 1.1875rem;
}

.durations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0 1.5rem;
  padding: 0;
  border: 0;
}

legend {
  float: left;
  margin-right: 0.5rem;
  padding: 0;
  color: var(--on-land-secondary);
  font-weight: 600;
}

/* The radio stays in the page for keyboard and screen readers; the label is what is seen. */
input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/*
 * A capsule with a round chip on its trailing edge. Choosing it fills the
 * capsule with sun and the chip crosses to the leading edge, overshooting a
 * little before it settles.
 */
label {
  position: relative;
  display: inline-block;
  min-width: 5.25rem;
  padding: 0.45rem 2.3rem 0.45rem 1rem;
  border: 2px solid var(--on-land);
  border-radius: 999px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
  transition:
    padding 0.4s var(--ease-swell),
    background-color 0.2s;
}

label::after {
  content: "";
  position: absolute;
  top: 50%;
  left: calc(100% - 1.75rem);
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid var(--on-land);
  border-radius: 50%;
  translate: 0 -50%;
  transition:
    left 0.4s var(--ease-swell),
    background-color 0.2s;
}

@media (hover: hover) {
  label:hover {
    background: color-mix(in srgb, var(--on-land) 10%, transparent);
  }
}

input:checked + label {
  padding: 0.45rem 1rem 0.45rem 2.3rem;
  border-color: var(--on-land);
  background: var(--sun);
  color: var(--capsule-ink);
}

input:checked + label::after {
  left: 0.45rem;
  border-color: var(--capsule-ink);
  background: var(--capsule-ink);
}

input:focus-visible + label {
  outline: 3px solid var(--on-land);
  outline-offset: 3px;
}

.answers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1.75rem 3rem;
}

.when {
  margin-top: 0.75rem;
  font-size: clamp(2.125rem, 4.3vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.quiet {
  margin-top: 0.6rem;
  color: var(--on-land-secondary);
  font-size: 1.0625rem;
}

.note {
  margin-top: 1.75rem;
  font-size: 0.9375rem;
}
</style>
