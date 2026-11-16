<script setup lang="ts">
const { t } = useI18n();
const format = useFormatters();
const localePath = useLocalePath();

const { localeProperties } = useI18n();
usePageMeta({
  title: () => t("site.title"),
  description: () => t("site.description"),
  structuredData: () =>
    datasetJsonLd({
      name: t("share.datasetName"),
      description: t("site.description"),
      url: `${SITE_URL}${localePath("index") === "/" ? "" : localePath("index")}`,
      language: localeProperties.value.language ?? "de-DE",
      temporalCoverage: `${FIRST_DAY}/..`,
      variables: [t("variables.price"), t("variables.generation"), t("variables.co2")],
    }),
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
  const first = hourlyMeans(values.slice(0, split), starts.slice(0, split), format.value);
  const second = hourlyMeans(values.slice(split), starts.slice(split), format.value);
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
  const measuredStarts = today.value.starts.slice(0, view.mixSlots);
  const perGroup = MIX_GROUPS.map((group) =>
    hourlyMeans(view.mix[group.id].slice(0, view.mixSlots), measuredStarts, format.value),
  );
  const co2 = hourlyMeans(view.co2.series.slice(0, view.mixSlots), measuredStarts, format.value);
  return (perGroup[0] ?? []).map((row, index) => ({
    time: row.time,
    values: perGroup.map((rows) => rows[index]?.value ?? null),
    co2: co2[index]?.value ?? null,
  }));
});

/** The three figures above the generation chart; empty before the first measurement of the day. */
const generationFigures = computed(() => {
  const view = dashboard.value;
  if (!view || !today.value || view.mixSlots === 0) return [];
  const f = format.value;
  const latestStart = today.value.starts[view.mixSlots - 1]!;
  const time = `${f.time(latestStart)}–${f.time(latestStart + view.timeline.step)}`;
  return [
    {
      id: "co2-latest",
      label: t("figures.co2Latest"),
      value: view.co2.latest === null ? "–" : f.grams(view.co2.latest),
      note: t("figures.estimate", { time }),
    },
    {
      id: "co2-today",
      label: t("figures.co2Today"),
      value: view.co2.todaySoFar === null ? "–" : f.grams(view.co2.todaySoFar),
      note: t("figures.germanMix", {
        year: EMISSION_SOURCE.year,
        value: f.grams(EMISSION_SOURCE.germanMix2024),
      }),
    },
    {
      id: "renewables-latest",
      label: t("figures.renewablesLatest"),
      value: view.renewableShareLatest === null ? "–" : f.share(view.renewableShareLatest),
      note: t("figures.shareOfGeneration", { time }),
    },
  ];
});

const legend = [...MIX_GROUPS].reverse();
const updated = computed(() => (data.value ? format.value.time(data.value.fetchedAt) : null));
const yesterday = computed(() => addDays(berlinDateKey(now.value), -1));
const dayLabel = computed(() =>
  t("footer.day", {
    weekday: format.value.weekday(now.value),
    date: format.value.dayMonth(now.value),
  }),
);

const cell = (value: number | null, show: (value: number) => string) =>
  value === null ? "–" : show(value);
</script>

<template>
  <main class="dashboard">
    <header class="intro">
      <h1>Stromfenster</h1>
      <p class="lead">{{ t("site.question") }}</p>
      <p class="secondary">{{ t("site.intro") }}</p>
    </header>

    <section v-if="error || !dashboard" class="card unavailable" role="status">
      <h2>{{ t("states.unavailableTitle") }}</h2>
      <p class="secondary">{{ t("states.unavailableText") }}</p>
    </section>

    <template v-else>
      <p v-if="dashboard.stale" class="card stale" role="status">{{ t("states.stale") }}</p>

      <BestWindows :dashboard="dashboard" />

      <p class="price-note secondary">
        {{ t("priceNote.text") }}
        <NuxtLink :to="localePath({ name: 'methodology', hash: '#prices' })">{{
          t("priceNote.link")
        }}</NuxtLink>
      </p>

      <ChartCard
        :title="t('charts.price.title')"
        :subtitle="t('charts.price.subtitle')"
        :table-label="t('charts.price.table')"
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
            :window-label="t('charts.price.band')"
            color="var(--price)"
            :format="format.price"
            :format-tick="format.whole"
            :width="width"
            :height="height"
            :label="t('charts.price.aria')"
          />
        </template>
        <template #table>
          <table>
            <caption>
              {{
                t("charts.price.caption")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t("charts.hour") }}</th>
                <th scope="col">{{ t("charts.today") }}</th>
                <th scope="col">{{ t("charts.tomorrow") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in priceRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td>{{ cell(row.today, format.decimal) }}</td>
                <td>{{ cell(row.tomorrow, format.decimal) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>

      <ChartCard
        :title="t('charts.share.title')"
        :subtitle="t('charts.share.subtitle')"
        :table-label="t('charts.share.table')"
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
            :window-label="t('charts.share.band')"
            color="var(--clean)"
            :format="format.share"
            :format-tick="format.share"
            :width="width"
            :height="height"
            :label="t('charts.share.aria')"
          />
        </template>
        <template #table>
          <table>
            <caption>
              {{
                t("charts.share.caption")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t("charts.hour") }}</th>
                <th scope="col">{{ t("charts.today") }}</th>
                <th scope="col">{{ t("charts.tomorrow") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in shareRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td>{{ cell(row.today, format.share) }}</td>
                <td>{{ cell(row.tomorrow, format.share) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>

      <ChartCard
        v-if="today"
        :title="t('charts.mix.title')"
        :subtitle="t('charts.mix.subtitle')"
        :table-label="t('charts.mix.table')"
      >
        <template #legend>
          <dl v-if="generationFigures.length" class="figures">
            <div v-for="figure in generationFigures" :key="figure.id">
              <dt>{{ figure.label }}</dt>
              <dd>{{ figure.value }}</dd>
              <dd class="figure-note">{{ figure.note }}</dd>
            </div>
          </dl>
          <p class="figures-source secondary">
            {{ t("figures.source") }}
            <NuxtLink :to="localePath({ name: 'methodology', hash: '#co2' })">{{
              t("figures.link")
            }}</NuxtLink>
          </p>
          <ul class="legend">
            <li v-for="group in legend" :key="group.id">
              <span :class="`swatch swatch--${group.id}`" />{{ t(`mix.${group.id}`) }}
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
            :label="t('charts.mix.aria')"
          />
        </template>
        <template #table>
          <table>
            <caption>
              {{
                t("charts.mix.caption")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t("charts.hour") }}</th>
                <th v-for="group in MIX_GROUPS" :key="group.id" scope="col">
                  {{ t(`mix.${group.id}`) }}
                </th>
                <th scope="col">{{ t("charts.mix.co2") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in mixRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td v-for="(value, index) in row.values" :key="index">
                  {{ cell(value, format.decimal) }}
                </td>
                <td>{{ cell(row.co2, format.whole) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>
    </template>

    <footer class="secondary">
      <p>
        {{ dayLabel
        }}<template v-if="updated"> · {{ t("footer.asOf", { time: updated }) }}</template> ·
        {{ t("footer.zone") }}
      </p>
      <p>
        {{ t("footer.pastDays") }}:
        <NuxtLink :to="localePath({ name: 'day-date', params: { date: yesterday } })">{{
          t("footer.yesterday")
        }}</NuxtLink>
      </p>
      <p>
        {{ t("footer.data") }}
        <a href="https://www.smard.de">Bundesnetzagentur | SMARD.de</a>,
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
        · <NuxtLink :to="localePath('methodology')">{{ t("nav.methodology") }}</NuxtLink> ·
        <LanguageSwitch />
      </p>
    </footer>
  </main>
</template>

<style scoped>
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

.price-note {
  padding: 0 0.25rem;
  font-size: 0.875rem;
}

footer {
  display: grid;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem 0;
  font-size: 0.875rem;
}
</style>
