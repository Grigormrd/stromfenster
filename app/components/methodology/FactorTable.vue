<script setup lang="ts">
import type { GenerationSeriesId } from "#shared/utils/emissions";

/**
 * The emission factors, built from the definitions the calculation uses, so
 * the page cannot say something else than the code does.
 */
const { t } = useI18n();
const format = useFormatters();

const rows = (Object.keys(EMISSION_FACTORS) as GenerationSeriesId[])
  .map((id) => ({ id, ...EMISSION_FACTORS[id] }))
  .sort((a, b) => b.gramsPerKwh - a.gramsPerKwh);
</script>

<template>
  <!-- Outside the scrolling area, so a wide table on a narrow screen does not cut it off. -->
  <p id="factor-table-caption" class="table-caption">{{ t("factors.caption") }}</p>
  <div class="table-scroll">
    <table class="factors" aria-labelledby="factor-table-caption">
      <thead>
        <tr>
          <th scope="col">{{ t("factors.series") }}</th>
          <th scope="col" class="number">{{ t("factors.unit") }}</th>
          <th scope="col">{{ t("factors.basisHeading") }}</th>
          <th scope="col">{{ t("factors.note") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <th scope="row">{{ t(`series.${row.id}`) }}</th>
          <td class="number">{{ format.whole(row.gramsPerKwh) }}</td>
          <td>{{ t(`factors.basis.${row.basis}`) }}</td>
          <td>{{ row.basis === "published" ? "" : t(`factors.notes.${row.id}`) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
