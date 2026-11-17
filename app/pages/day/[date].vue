<script setup lang="ts">
import type { DayData } from "#shared/utils/day-data";

// One calendar day: its prices, its generation and the CO₂ estimate.
// Past days do not change much and are cached for an hour (docs/adr/0009).
const route = useRoute();
const { t } = useI18n();
const format = useFormatters();
const localePath = useLocalePath();
const config = useRuntimeConfig();

const date = String(route.params.date ?? "");
const fixedNow = config.public.fixedNow ? Date.parse(config.public.fixedNow) / 1000 : null;
const now = useState<number>(`day-now-${date}`, () => fixedNow ?? Math.floor(Date.now() / 1000));
const tomorrow = addDays(berlinDateKey(now.value), 1);

// Only real dates in the range that can have data get a page.
if (!isDateKey(date) || date < FIRST_DAY || date > tomorrow) {
  throw createError({ statusCode: 404, statusMessage: "Not found", fatal: true });
}

const event = import.meta.server ? useRequestEvent() : undefined;
const cacheControl = import.meta.server ? useResponseHeader("cache-control") : undefined;

const { data, error } = await useAsyncData(`day-${date}`, () =>
  $fetch<DayData>(`${config.public.dataApiUrl}/api/days/${date}`, { timeout: 8000 }),
);

if (error.value) {
  // Not a page worth caching: say so, and let the next request try again.
  if (event) setResponseStatus(event, 503);
  if (cacheControl) cacheControl.value = "no-store";
}

const summary = computed(() => (data.value ? summariseDay(data.value) : null));

if (summary.value && !summary.value.hasData) {
  throw createError({ statusCode: 404, statusMessage: "Not found", fatal: true });
}

const dayStart = berlinDayStart(date);
const longDate = computed(() => format.value.fullDate(dayStart));

const { localeProperties } = useI18n();
usePageMeta({
  title: () => t("day.title", { date: longDate.value }),
  description: () => t("day.description", { date: longDate.value }),
  structuredData: () =>
    datasetJsonLd({
      name: t("share.datasetDay", { date: longDate.value }),
      description: t("day.description", { date: longDate.value }),
      url: `${SITE_URL}${route.path}`,
      language: localeProperties.value.language ?? "de-DE",
      temporalCoverage: date,
      variables: [t("variables.price"), t("variables.generation"), t("variables.co2")],
    }),
});

const nowSlot = computed(() => {
  const view = summary.value;
  if (!view) return -1;
  const index = view.starts.findLastIndex((start) => start <= now.value);
  return index >= 0 && now.value < view.starts[index]! + 900 ? index : -1;
});

const slotTime = (slot: number) => {
  const start = summary.value!.starts[slot]!;
  return t("day.at", { from: format.value.time(start), to: format.value.time(start + 900) });
};

const figures = computed(() => {
  const view = summary.value;
  if (!view) return [];
  const f = format.value;
  const list: { id: string; label: string; value: string; note: string }[] = [];
  if (view.prices) {
    list.push(
      {
        id: "average",
        label: t("day.averagePrice"),
        value: f.price(view.prices.average),
        note: "",
      },
      {
        id: "lowest",
        label: t("day.lowest"),
        value: f.price(view.prices.lowest.value),
        note: slotTime(view.prices.lowest.slot),
      },
      {
        id: "highest",
        label: t("day.highest"),
        value: f.price(view.prices.highest.value),
        note: slotTime(view.prices.highest.slot),
      },
    );
  }
  if (view.mixSlots > 0) {
    const partial =
      view.mixSlots < view.starts.length
        ? t("day.partial", { measured: view.mixSlots, total: view.starts.length })
        : "";
    list.push(
      {
        id: "co2",
        label: t("day.co2"),
        value: view.co2.mean === null ? "–" : f.grams(view.co2.mean),
        note: [t("day.estimate"), partial].filter(Boolean).join(", "),
      },
      {
        id: "renewables",
        label: t("day.renewables"),
        value: view.renewableShare === null ? "–" : f.share(view.renewableShare),
        note: [t("day.shareOfGeneration"), partial].filter(Boolean).join(", "),
      },
    );
  }
  return list;
});

const priceRows = computed(() =>
  summary.value ? hourlyMeans(summary.value.price, summary.value.starts, format.value) : [],
);

const mixRows = computed(() => {
  const view = summary.value;
  if (!view) return [];
  const starts = view.starts.slice(0, view.mixSlots);
  const perGroup = MIX_GROUPS.map((group) =>
    hourlyMeans(view.mix[group.id].slice(0, view.mixSlots), starts, format.value),
  );
  const co2 = hourlyMeans(view.co2.series.slice(0, view.mixSlots), starts, format.value);
  return (perGroup[0] ?? []).map((row, index) => ({
    time: row.time,
    values: perGroup.map((rows) => rows[index]?.value ?? null),
    co2: co2[index]?.value ?? null,
  }));
});

const previousDay = addDays(date, -1);
const nextDay = addDays(date, 1);
const neighbours = computed(() => ({
  previous: previousDay >= FIRST_DAY ? previousDay : null,
  next: nextDay <= tomorrow ? nextDay : null,
}));
const dayLink = (day: string) => localePath({ name: "day-date", params: { date: day } });
const shortDate = (day: string) => format.value.dayMonth(berlinDayStart(day));

const legend = [...MIX_GROUPS].reverse();
const cell = (value: number | null, show: (value: number) => string) =>
  value === null ? "–" : show(value);
</script>

<template>
  <main class="dashboard day-page">
    <LandHeader>
      <header class="intro">
        <h1>{{ t("day.heading", { date: longDate }) }}</h1>
        <p class="intro-text">{{ t("day.lead") }}</p>
      </header>
      <section
        v-if="!error && summary && figures.length"
        class="day-figures"
        :aria-label="t('day.heading', { date: longDate })"
      >
        <dl class="figures">
          <div v-for="figure in figures" :key="figure.id">
            <dt>{{ figure.label }}</dt>
            <dd>{{ figure.value }}</dd>
            <dd v-if="figure.note" class="figure-note">{{ figure.note }}</dd>
          </div>
        </dl>
        <p class="figures-source secondary">
          {{ t("figures.source") }}
          <NuxtLink :to="localePath({ name: 'methodology', hash: '#co2' })">{{
            t("figures.link")
          }}</NuxtLink>
        </p>
      </section>
    </LandHeader>

    <section v-if="error || !summary" class="card unavailable" role="status">
      <h2>{{ t("states.unavailableTitle") }}</h2>
      <p class="secondary">{{ t("states.unavailableText") }}</p>
    </section>

    <template v-else>
      <ChartCard
        v-if="summary.prices"
        :title="t('day.price')"
        :subtitle="t('day.priceSubtitle')"
        :table-label="t('charts.price.table')"
      >
        <template #default="{ width, height }">
          <LineChart
            :starts="summary.starts"
            :values="summary.price"
            :now-slot="nowSlot"
            :day-split="summary.starts.length"
            :windows="[]"
            window-label=""
            :day-names="[format.weekday(dayStart)]"
            color="var(--price)"
            wash-color="var(--price-wash)"
            :format="format.price"
            :format-tick="format.whole"
            :width="width"
            :height="height"
            :label="t('day.priceAria')"
          />
        </template>
        <template #table>
          <table>
            <caption>
              {{
                t("day.priceCaption")
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t("charts.hour") }}</th>
                <th scope="col">{{ t("day.price") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in priceRows" :key="row.time">
                <th scope="row">{{ row.time }}</th>
                <td>{{ cell(row.value, format.decimal) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </ChartCard>
      <p v-else class="card secondary">{{ t("day.noPrice") }}</p>

      <ChartCard
        v-if="summary.mixSlots > 0"
        :title="t('day.mixTitle')"
        :subtitle="t('day.mixSubtitle')"
        :table-label="t('charts.mix.table')"
      >
        <template #legend>
          <ul class="legend">
            <li v-for="group in legend" :key="group.id">
              <span :class="`swatch swatch--${group.id}`" />{{ t(`mix.${group.id}`) }}
            </li>
          </ul>
        </template>
        <template #default="{ width, height }">
          <MixChart
            :mix="summary.mix"
            :starts="summary.starts"
            :measured="summary.mixSlots"
            :now-slot="nowSlot"
            :width="width"
            :height="height"
            :label="t('day.mixAria')"
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
      <p v-else class="card secondary">{{ t("day.noGeneration") }}</p>
    </template>

    <nav class="day-nav" :aria-label="t('day.otherDays')">
      <NuxtLink v-if="neighbours.previous" :to="dayLink(neighbours.previous)" rel="prev">
        <span class="chip" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false"><path d="M13 8H3.5M7.5 4 3.5 8l4 4" /></svg>
        </span>
        <span class="visually-hidden">{{ t("day.previousLabel") }}: </span>
        {{ t("day.previous", { date: shortDate(neighbours.previous) }) }}
      </NuxtLink>
      <NuxtLink v-if="neighbours.next" :to="dayLink(neighbours.next)" rel="next">
        <span class="visually-hidden">{{ t("day.nextLabel") }}: </span>
        {{ t("day.next", { date: shortDate(neighbours.next) }) }}
        <span class="chip" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false"><path d="M3 8h9.5M8.5 4l4 4-4 4" /></svg>
        </span>
      </NuxtLink>
    </nav>

    <footer class="site-footer secondary">
      <p>
        {{ t("footer.zone") }} · {{ t("footer.data") }}
        <a href="https://www.smard.de">Bundesnetzagentur | SMARD.de</a>,
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
        · <NuxtLink :to="localePath('methodology')">{{ t("nav.methodology") }}</NuxtLink>
      </p>
    </footer>
  </main>
</template>

<style scoped>
.intro {
  max-width: 46rem;
}

h1 {
  font-size: clamp(2.25rem, 6vw, 4rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1;
}

.intro-text {
  margin-top: 1rem;
  color: var(--on-land-secondary);
  font-size: 1.1875rem;
}

.day-figures {
  margin-top: clamp(2rem, 5vw, 2.75rem);
}

.day-figures :deep(dt),
.day-figures :deep(.figure-note),
.day-figures .figures-source {
  color: var(--on-land-secondary);
}

.day-figures .figures-source {
  margin-bottom: 0;
}

.unavailable h2 {
  font-size: 1.375rem;
}

.unavailable p {
  margin-top: 0.5rem;
}

/* Previous and next day as outlined capsules. */
.day-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
}

.day-nav a {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.4rem;
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s;
}

@media (hover: hover) {
  .day-nav a:hover {
    background: var(--ink);
    color: var(--water);
  }

  .day-nav a:hover .chip {
    background: var(--water);
    color: var(--ink);
  }
}

.day-nav a[rel="prev"] {
  padding-right: 1.1rem;
}

.day-nav a[rel="next"] {
  margin-left: auto;
  padding-left: 1.1rem;
}

/* The arrow rides in an ink circle at the leading or trailing edge, as on the capsules. */
.chip {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--ink);
  color: var(--water);
}

.chip svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
