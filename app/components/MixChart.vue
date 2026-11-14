<script setup lang="ts">
import type { Mix } from "#shared/utils/mix";

/**
 * Today's measured generation as a stacked area, six groups, drawn as SVG on
 * the server. The hours that have not happened yet stay empty.
 */
const props = defineProps<{
  mix: Mix;
  /** Start of each quarter hour of today, epoch seconds. */
  starts: number[];
  /** Quarter hours with measured values. */
  measured: number;
  /** Index of the current quarter hour, or -1. */
  nowSlot: number;
  width: number;
  height: number;
  /** Accessible name of the chart. */
  label: string;
}>();

const margin = { top: 12, right: 12, bottom: 26, left: 40 };
const plot = computed(() => ({
  left: margin.left,
  right: props.width - margin.right,
  top: margin.top,
  bottom: props.height - margin.bottom,
}));

/** Cumulative totals per group: `stack[g][slot]` is the top edge of group g. */
const stack = computed(() => {
  const totals: number[][] = [];
  let below = new Array<number>(props.measured).fill(0);
  for (const group of MIX_GROUPS) {
    const top = below.map((sum, slot) => sum + (props.mix[group.id][slot] ?? 0));
    totals.push(top);
    below = top;
  }
  return totals;
});

const ticks = computed(() => niceTicks(0, Math.max(1, ...(stack.value.at(-1) ?? [])), 4));

const x = computed(() => {
  const scale = linearScale([0, props.starts.length], [plot.value.left, plot.value.right]);
  return (index: number) => scale(index);
});
const y = computed(() =>
  linearScale([0, ticks.value.at(-1)!], [plot.value.bottom, plot.value.top]),
);

const bands = computed(() =>
  MIX_GROUPS.map((group, index) => ({
    id: group.id,
    path: stepBand(
      index === 0 ? new Array<number>(props.measured).fill(0) : stack.value[index - 1]!,
      stack.value[index]!,
      x.value,
      y.value,
    ),
  })),
);

/** The "now" label shares the time axis; a tick label this close to it would overlap. */
const nearNow = (index: number) =>
  props.nowSlot >= 0 && Math.abs(x.value(index) - x.value(props.nowSlot)) < 34;

const hourTicks = computed(() => {
  const every = props.width >= 560 ? 3 : 6;
  return props.starts
    .map((start, index) => ({ index, label: formatTime(start) }))
    .filter(({ label }) => label.endsWith(":00") && Number(label.slice(0, 2)) % every === 0)
    .filter(({ index }) => !nearNow(index));
});

const hovered = ref<number | null>(null);
const svg = ref<SVGSVGElement | null>(null);

function onPointerMove(event: PointerEvent) {
  const box = svg.value?.getBoundingClientRect();
  if (!box || box.width === 0) return;
  const position = ((event.clientX - box.left) / box.width) * props.width;
  const index = Math.floor(
    ((position - plot.value.left) / (plot.value.right - plot.value.left)) * props.starts.length,
  );
  hovered.value = index >= 0 && index < props.measured ? index : null;
}

const tooltip = computed(() => {
  const index = hovered.value;
  if (index === null) return null;
  const start = props.starts[index]!;
  const center = (x.value(index) + x.value(index + 1)) / 2;
  const left = (center / props.width) * 100;
  const share = renewableShare(props.mix, index);
  return {
    left,
    alignRight: left > 55,
    x: center,
    time: `${formatTime(start)}–${formatTime(start + 900)}`,
    // Top of the stack first, as in the chart.
    rows: [...MIX_GROUPS].reverse().map((group) => ({
      id: group.id,
      label: group.label,
      value: `${formatDecimal(props.mix[group.id][index] ?? 0)} GW`,
    })),
    share: share === null ? null : formatShare(share),
  };
});
</script>

<template>
  <div class="chart" @pointerleave="hovered = null">
    <svg
      ref="svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="label"
      @pointermove="onPointerMove"
    >
      <g class="grid">
        <template v-for="tick in ticks" :key="tick">
          <line
            :x1="plot.left"
            :x2="plot.right"
            :y1="y(tick)"
            :y2="y(tick)"
            :class="{ baseline: tick === 0 }"
          />
          <text :x="plot.left - 6" :y="y(tick)" dy="0.32em" text-anchor="end">{{ tick }}</text>
        </template>
      </g>

      <g class="time">
        <text
          v-for="tick in hourTicks"
          :key="tick.index"
          :x="x(tick.index)"
          :y="plot.bottom + 16"
          text-anchor="middle"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- The surface-coloured stroke is the gap between neighbouring bands. -->
      <path v-for="band in bands" :key="band.id" :d="band.path" :class="`band band--${band.id}`" />

      <g v-if="nowSlot >= 0 && nowSlot < starts.length" class="now">
        <line :x1="x(nowSlot)" :x2="x(nowSlot)" :y1="plot.top" :y2="plot.bottom" />
        <text :x="x(nowSlot)" :y="plot.bottom + 16" text-anchor="middle">now</text>
      </g>

      <g v-if="tooltip" class="hover">
        <line :x1="tooltip.x" :x2="tooltip.x" :y1="plot.top" :y2="plot.bottom" />
      </g>
    </svg>

    <div
      v-if="tooltip"
      class="tooltip"
      :class="{ 'tooltip--right': tooltip.alignRight }"
      :style="{ left: `${tooltip.left}%` }"
    >
      <span class="tooltip-time">{{ tooltip.time }}</span>
      <span v-for="row in tooltip.rows" :key="row.id" class="tooltip-row">
        <span :class="`swatch swatch--${row.id}`" />
        <span>{{ row.label }}</span>
        <strong>{{ row.value }}</strong>
      </span>
      <span v-if="tooltip.share" class="tooltip-time">Renewable: {{ tooltip.share }}</span>
    </div>
  </div>
</template>

<style scoped>
.chart {
  position: relative;
}

svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;
}

text {
  fill: var(--ink-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.grid line {
  stroke: var(--grid);
  stroke-width: 1;
}

.grid line.baseline {
  stroke: var(--axis);
}

.band {
  stroke: var(--surface);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.band--other,
.swatch--other {
  fill: var(--mix-other);
  background: var(--mix-other);
}

.band--coal,
.swatch--coal {
  fill: var(--mix-coal);
  background: var(--mix-coal);
}

.band--gas,
.swatch--gas {
  fill: var(--mix-gas);
  background: var(--mix-gas);
}

.band--other_renewables,
.swatch--other_renewables {
  fill: var(--mix-other-renewables);
  background: var(--mix-other-renewables);
}

.band--wind,
.swatch--wind {
  fill: var(--mix-wind);
  background: var(--mix-wind);
}

.band--solar,
.swatch--solar {
  fill: var(--mix-solar);
  background: var(--mix-solar);
}

.now line {
  stroke: var(--ink);
  stroke-width: 1;
}

.now text {
  fill: var(--ink);
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 4px;
}

.hover line {
  stroke: var(--ink);
  stroke-width: 1;
}

.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(8px);
  display: grid;
  gap: 0.1rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
  font-size: 0.8125rem;
  white-space: nowrap;
  pointer-events: none;
}

.tooltip--right {
  transform: translateX(calc(-100% - 8px));
}

.tooltip-time {
  color: var(--ink-secondary);
}

.tooltip-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.4rem;
  align-items: center;
}

.swatch {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 2px;
}
</style>
