// Geometry for the charts. They are plain SVG rendered by Vue on the server,
// so the few pieces a chart library would bring are written out here.

/** Maps a value from `domain` to `range`, linearly. */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const factor = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * factor;
}

/**
 * Round tick values that cover `min` to `max`: steps of 1, 2 or 5 times a
 * power of ten, aiming at about `count` ticks. The first and last tick enclose
 * the data, so they also serve as the axis domain.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rough = (max - min) / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;

  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Counting steps instead of adding them up keeps 0.1 + 0.2 out of the labels.
  for (let index = 0; first + index * step <= last + step / 2; index++) {
    ticks.push(Number((first + index * step).toFixed(10)));
  }
  return ticks;
}

export interface PlotPoint {
  x: number;
  y: number;
}

const point = (value: number) => Number(value.toFixed(2));

/**
 * A step line: each value holds for the width of its slot. A gap in the data
 * ends the line and the next value starts a new one, so nothing is drawn
 * across the gap.
 */
export function stepLine(
  values: readonly (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const left = point(x(index));
    const right = point(x(index + 1));
    const height = point(y(value));
    path += drawing ? `V${height}H${right}` : `M${left},${height}H${right}`;
    drawing = true;
  });
  return path;
}

/** The area between a step line and a baseline, for the wash under the line. */
export function stepArea(
  values: readonly (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
  baseline: number,
): string {
  let path = "";
  let runStart: number | null = null;
  const close = () => {
    if (runStart === null) return;
    path += `V${point(baseline)}H${point(x(runStart))}Z`;
    runStart = null;
  };
  values.forEach((value, index) => {
    if (value === null) {
      close();
      return;
    }
    const left = point(x(index));
    const right = point(x(index + 1));
    const height = point(y(value));
    if (runStart === null) {
      runStart = index;
      path += `M${left},${point(baseline)}V${height}H${right}`;
    } else {
      path += `V${height}H${right}`;
    }
  });
  close();
  return path;
}

/**
 * A band of a stacked area between two step lines: `lower` and `upper` are
 * the cumulative values below and including this band.
 */
export function stepBand(
  lower: readonly number[],
  upper: readonly number[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  if (upper.length === 0) return "";
  let path = `M${point(x(0))},${point(y(upper[0]!))}`;
  upper.forEach((value, index) => {
    path += `${index === 0 ? "" : `V${point(y(value))}`}H${point(x(index + 1))}`;
  });
  for (let index = lower.length - 1; index >= 0; index--) {
    path += `V${point(y(lower[index]!))}H${point(x(index))}`;
  }
  return `${path}Z`;
}
