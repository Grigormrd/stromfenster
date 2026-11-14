<script setup lang="ts">
const description =
  "Stromfenster shows when electricity in Germany is cheap and clean, based on day-ahead prices and the generation mix.";

useSeoMeta({
  title: "Stromfenster: when is electricity cheap and clean?",
  description,
});

const { dashboard, now, data, error, ready } = useDashboard();
await ready;

const today = computed(() => {
  const view = dashboard.value;
  if (!view) return null;
  const split = view.todaySlots;
  const starts = view.timeline.starts;
  return {
    starts: starts.slice(0, split),
    // The mix chart only covers today; after midnight the marker has left it.
    nowSlot: view.nowSlot < split ? view.nowSlot : -1,
  };
});

/** Hourly means of both days side by side, for the tables under the line charts. */
function twoDayRows(values: (number | null)[]) {
  const view = dashboard.value!;
  const split = view.todaySlots;
  const starts = view.timeline.starts;
  const first = hourlyMeans(values.slice(0, split), starts.slice(0, split));
  const second = hourlyMeans(values.slice(split), starts.slice(split));
  return first.map((row, index) => ({
    time: row.time,
    today: row.value,
    tomorrow: second[index]?.value ?? null,
  }));
}

const priceRows = computed(() =>
  dashboard.value ? twoDayRows(dashboard.value.timeline.price) : [],
);
const shareRows = computed(() =>
  dashboard.value ? twoDayRows(dashboard.value.timeline.windSolarShare) : [],
);

const mixRows = computed(() => {
  const view = dashboard.value;
  if (!view || !today.value) return [];
  const perGroup = MIX_GROUPS.map((group) =>
    hourlyMeans(
      view.mix[group.id].slice(0, view.mixSlots),
      today.value!.starts.slice(0, view.mixSlots),
    ),
  );
  return (perGroup[0] ?? []).map((row, index) => ({
    time: row.time,
    values: perGroup.map((rows) => rows[index]?.value ?? null),
  }));
});

const legend = [...MIX_GROUPS].reverse();
const updated = computed(() => (data.value ? formatTime(data.value.fetchedAt) : null));
const dayLabel = computed(() => `${formatWeekday(now.value)}, ${formatDayMonth(now.value)}`);

const cell = (value: number | null, format: (value: number) => string) =>
  value === null ? "–" : format(value);
</script>

<template>
  <main class="dashboard">
    <header class="intro">
      <h1>Stromfenster</h1>
      <p class="lead">When is electricity in Germany cheap and clean?</p>
      <p class="secondary">
        Day-ahead prices and the expected share of wind and solar, for today and tomorrow.
      </p>
    </header>

    <section v-if="error || !dashboard" class="card unavailable" role="status">
      <h2>The data is not available right now</h2>
      <p class="secondary">
        The service that provides prices and generation data did not answer. Please try again in a
        few minutes.
      </p>
    </section>

    <template v-else>
      <p v-if="dashboard.stale" class="card stale" role="status">
        There is no price for the current quarter hour. The figures below may be out of date.
      </p>

      <BestWindows :dashboard="dashboard" />

      <ChartCard
        title="Price"
        subtitle="Day-ahead wholesale price in ct/kWh, per quarter hour. Without taxes, levies and grid fees."
        table-label="Show the prices as a table"
      >
        <template #default="{ width, height }">
          <LineChart
            :starts="dashboard.timeline.starts"
            :values="dashboard.timeline.price"
            :now-slot="dashboard.nowSlot"
            :day-split="dashboard.todaySlots"
            :windows="
              dashboard.recommendations.map((r) => ({ duration: r.duration, window: r.cheapest }))
            "
            window-label="Cheapest"
            color="var(--price)"
            :format="formatPrice"
            :format-tick="(value: number) => String(value)"
            :width="width"
            :height="height"
            label="Line chart of the day-ahead price for today and tomorrow. The values are in the table below."
          />
        </template>
        <template #table>
          <table>
            <caption>
              Hourly mean in ct/kWh
            </caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Today</th>
                <th scope="col">Tomorrow</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in priceRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td>{{ cell(row.today, formatDecimal) }}</td>
                <td>{{ cell(row.tomorrow, formatDecimal) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>

      <ChartCard
        title="Wind and solar"
        subtitle="Expected share of wind and solar in electricity use, from the forecasts, per quarter hour."
        table-label="Show the shares as a table"
      >
        <template #default="{ width, height }">
          <LineChart
            :starts="dashboard.timeline.starts"
            :values="dashboard.timeline.windSolarShare"
            :now-slot="dashboard.nowSlot"
            :day-split="dashboard.todaySlots"
            :windows="
              dashboard.recommendations.map((r) => ({ duration: r.duration, window: r.cleanest }))
            "
            window-label="Most wind and solar"
            color="var(--clean)"
            :format="formatShare"
            :format-tick="formatShare"
            :width="width"
            :height="height"
            label="Line chart of the expected share of wind and solar for today and tomorrow. The values are in the table below."
          />
        </template>
        <template #table>
          <table>
            <caption>
              Hourly mean
            </caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Today</th>
                <th scope="col">Tomorrow</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in shareRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td>{{ cell(row.today, formatShare) }}</td>
                <td>{{ cell(row.tomorrow, formatShare) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>

      <ChartCard
        v-if="today"
        title="Generation today"
        subtitle="Measured net generation in GW, per quarter hour. Values arrive one to two hours late."
        table-label="Show the generation as a table"
      >
        <template #legend>
          <ul class="legend">
            <li v-for="group in legend" :key="group.id">
              <span :class="`swatch swatch--${group.id}`" />{{ group.label }}
            </li>
          </ul>
        </template>
        <template #default="{ width, height }">
          <MixChart
            :mix="dashboard.mix"
            :starts="today.starts"
            :measured="dashboard.mixSlots"
            :now-slot="today.nowSlot"
            :width="width"
            :height="height"
            label="Stacked area chart of today's electricity generation by source. The values are in the table below."
          />
        </template>
        <template #table>
          <table>
            <caption>
              Hourly mean in GW
            </caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th v-for="group in MIX_GROUPS" :key="group.id" scope="col">{{ group.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in mixRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td v-for="(value, index) in row.values" :key="index">
                  {{ cell(value, formatDecimal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>
    </template>

    <footer class="secondary">
      <p>
        {{ dayLabel }}<template v-if="updated"> · data as of {{ updated }}</template> · all times in
        German time
      </p>
      <p>
        Data:
        <a href="https://www.smard.de">Bundesnetzagentur | SMARD.de</a>,
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
      </p>
    </footer>
  </main>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 1rem;
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.intro {
  padding: 0 0.25rem 0.5rem;
}

h1 {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.lead {
  margin-top: 0.25rem;
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 650;
  line-height: 1.15;
  text-wrap: balance;
}

.intro .secondary {
  margin-top: 0.5rem;
}

.unavailable h2 {
  font-size: 1.125rem;
}

.stale {
  font-size: 0.9375rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
}

.swatch--other {
  background: var(--mix-other);
}

.swatch--coal {
  background: var(--mix-coal);
}

.swatch--gas {
  background: var(--mix-gas);
}

.swatch--other_renewables {
  background: var(--mix-other-renewables);
}

.swatch--wind {
  background: var(--mix-wind);
}

.swatch--solar {
  background: var(--mix-solar);
}

footer {
  display: grid;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem 0;
  font-size: 0.875rem;
}
</style>
