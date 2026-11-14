<script setup lang="ts">
import type { BestWindow } from "#shared/utils/best-window";

/**
 * One series over today and tomorrow as a step line, drawn as SVG on the
 * server. Bands mark the best window for each duration; CSS shows the band of
 * the duration that is selected (see main.css).
 */
const props = defineProps<{
  /** Start of each quarter hour, epoch seconds. */
  starts: number[];
  values: (number | null)[];
  /** Index of the current quarter hour, or -1. */
  nowSlot: number;
  /** Index at which tomorrow begins. */
  daySplit: number;
  /** The best window per duration in hours. */
  windows: { duration: number; window: BestWindow | null }[];
  /** Name of the band, e.g. "Cheapest". */
  windowLabel: string;
  /** CSS colour of the line. */
  color: string;
  /** Turns a value into axis and tooltip text. */
  format: (value: number) => string;
  /** Turns a value into a short axis label. */
  formatTick: (value: number) => string;
  /** Drawing width in px; the chart exists in a wide and a narrow version. */
  width: number;
  height: number;
  /** Accessible name of the chart. */
  label: string;
}>();

const margin = { top: 34, right: 12, bottom: 26, left: 40 };
const plot = computed(() => ({
  left: margin.left,
  right: props.width - margin.right,
  top: margin.top,
  bottom: props.height - margin.bottom,
}));

const ticks = computed(() => {
  const present = props.values.filter((value): value is number => value !== null);
  // The axis starts at zero, so the height of the line is the value; negative
  // prices extend it downwards.
  return niceTicks(Math.min(0, ...present), Math.max(0, ...present), 4);
});

const x = computed(() => {
  const scale = linearScale([0, props.values.length], [plot.value.left, plot.value.right]);
  return (index: number) => scale(index);
});
const y = computed(() =>
  linearScale([ticks.value[0]!, ticks.value.at(-1)!], [plot.value.bottom, plot.value.top]),
);

const line = computed(() => stepLine(props.values, x.value, y.value));
const area = computed(() => stepArea(props.values, x.value, y.value, y.value(0)));

/** The "now" label shares the time axis; a tick label this close to it would overlap. */
const nearNow = (index: number) =>
  props.nowSlot >= 0 && Math.abs(x.value(index) - x.value(props.nowSlot)) < 34;

/** A label every six hours when there is room, every twelve when there is not. */
const hourTicks = computed(() => {
  const every = props.width >= 560 ? 6 : 12;
  return props.starts
    .map((start, index) => ({ index, label: formatTime(start) }))
    .filter(({ label }) => label.endsWith(":00") && Number(label.slice(0, 2)) % every === 0)
    .filter(({ index }) => !nearNow(index));
});

const days = computed(() =>
  [0, props.daySplit]
    .filter((index, position) => position === 0 || index < props.starts.length)
    .map((index, position) => ({
      index,
      label: `${position === 0 ? "Today" : "Tomorrow"}, ${formatWeekday(props.starts[index]!)}`,
    })),
);

const bands = computed(() =>
  props.windows
    .filter((entry): entry is { duration: number; window: BestWindow } => entry.window !== null)
    .map(({ duration, window }) => {
      const left = x.value(window.start);
      const right = x.value(window.end);
      const center = (left + right) / 2;
      // Keep the label inside the plot when the band is near an edge.
      const anchor =
        center < plot.value.left + 70 ? "start" : center > plot.value.right - 70 ? "end" : "middle";
      const labelX = anchor === "start" ? left : anchor === "end" ? right : center;
      return {
        duration,
        left,
        width: right - left,
        anchor,
        labelX,
        text: `${props.windowLabel} ${duration} h`,
      };
    }),
);

// Hover: a crosshair and a tooltip for the quarter hour under the pointer.
// The values are also in the table below the chart; this is a convenience.
const hovered = ref<number | null>(null);
const svg = ref<SVGSVGElement | null>(null);

function onPointerMove(event: PointerEvent) {
  const box = svg.value?.getBoundingClientRect();
  if (!box || box.width === 0) return;
  const position = ((event.clientX - box.left) / box.width) * props.width;
  const index = Math.floor(
    ((position - plot.value.left) / (plot.value.right - plot.value.left)) * props.values.length,
  );
  hovered.value = index >= 0 && index < props.values.length ? index : null;
}

const tooltip = computed(() => {
  const index = hovered.value;
  if (index === null) return null;
  const value = props.values[index];
  const start = props.starts[index]!;
  const left = ((x.value(index) + x.value(index + 1)) / 2 / props.width) * 100;
  return {
    left,
    alignRight: left > 60,
    time: `${index < props.daySplit ? "Today" : "Tomorrow"} ${formatTime(start)}–${formatTime(start + 900)}`,
    value: value === null || value === undefined ? "no value" : props.format(value),
    x: (x.value(index) + x.value(index + 1)) / 2,
    y: value === null || value === undefined ? null : y.value(value),
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
      <!-- Grid and value axis -->
      <g class="grid">
        <template v-for="tick in ticks" :key="tick">
          <line
            :x1="plot.left"
            :x2="plot.right"
            :y1="y(tick)"
            :y2="y(tick)"
            :class="{ baseline: tick === 0 }"
          />
          <text :x="plot.left - 6" :y="y(tick)" dy="0.32em" text-anchor="end">
            {{ formatTick(tick) }}
          </text>
        </template>
      </g>

      <!-- Time axis -->
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
        <template v-for="(day, position) in days" :key="day.index">
          <line
            v-if="position > 0"
            :x1="x(day.index)"
            :x2="x(day.index)"
            :y1="plot.top - 22"
            :y2="plot.bottom"
            class="day-rule"
          />
          <text :x="x(day.index) + (position > 0 ? 6 : 0)" :y="12" class="day">
            {{ day.label }}
          </text>
        </template>
      </g>

      <!-- Best window for each duration; CSS shows the selected one -->
      <g v-for="band in bands" :key="band.duration" :data-duration="band.duration" class="band">
        <rect
          :x="band.left"
          :y="plot.top"
          :width="band.width"
          :height="plot.bottom - plot.top"
          :fill="color"
        />
        <text :x="band.labelX" :y="plot.top - 6" :text-anchor="band.anchor">{{ band.text }}</text>
      </g>

      <!-- The series: a wash under a 2px line -->
      <path :d="area" :fill="color" class="wash" />
      <path :d="line" :stroke="color" class="line" />

      <!-- Now -->
      <g v-if="nowSlot >= 0" class="now">
        <line :x1="x(nowSlot)" :x2="x(nowSlot)" :y1="plot.top" :y2="plot.bottom" />
        <text :x="x(nowSlot)" :y="plot.bottom + 16" text-anchor="middle">now</text>
      </g>

      <!-- Hover -->
      <g v-if="tooltip" class="hover">
        <line :x1="tooltip.x" :x2="tooltip.x" :y1="plot.top" :y2="plot.bottom" />
        <circle v-if="tooltip.y !== null" :cx="tooltip.x" :cy="tooltip.y" r="4" :fill="color" />
      </g>
    </svg>

    <div
      v-if="tooltip"
      class="tooltip"
      :class="{ 'tooltip--right': tooltip.alignRight }"
      :style="{ left: `${tooltip.left}%` }"
    >
      <span class="tooltip-time">{{ tooltip.time }}</span>
      <strong>{{ tooltip.value }}</strong>
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

.day {
  fill: var(--ink);
  font-weight: 600;
}

.day-rule {
  stroke: var(--axis);
  stroke-width: 1;
}

.band rect {
  opacity: 0.16;
}

.band text {
  fill: var(--ink);
  font-weight: 600;
}

.wash {
  opacity: 0.1;
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.now line {
  stroke: var(--ink);
  stroke-width: 1;
}

.now text {
  fill: var(--ink);
  font-weight: 600;
  /* The label sits on the time axis; a halo keeps it apart from a tick below it. */
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 4px;
}

.hover line {
  stroke: var(--ink-secondary);
  stroke-width: 1;
}

.hover circle {
  stroke: var(--surface);
  stroke-width: 2;
}

.tooltip {
  position: absolute;
  top: 0;
  transform: translateX(8px);
  display: grid;
  padding: 0.35rem 0.6rem;
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
</style>
