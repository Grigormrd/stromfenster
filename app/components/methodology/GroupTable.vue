<script setup lang="ts">
/** Which SMARD series make up each group of the generation chart, top of the stack first. */
const { t } = useI18n();

const rows = [...MIX_GROUPS].reverse();
</script>

<template>
  <div class="table-scroll" tabindex="0" role="region" :aria-label="t('groups.caption')">
    <table :aria-label="t('groups.caption')">
      <thead>
        <tr>
          <th scope="col">{{ t("groups.group") }}</th>
          <th scope="col">{{ t("groups.series") }}</th>
          <th scope="col">{{ t("groups.renewable") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <th scope="row">{{ t(`mix.${row.id}`) }}</th>
          <td>{{ row.series.map((id) => t(`series.${id}`)).join(", ") }}</td>
          <td>{{ t(row.renewable ? "groups.yes" : "groups.no") }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
