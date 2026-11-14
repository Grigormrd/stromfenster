export interface BestWindow {
  /** Index of the first slot of the window. */
  start: number;
  /** Index after its last slot. */
  end: number;
  /** Mean of the values in the window. */
  average: number;
}

/**
 * Finds the window of `length` consecutive slots with the lowest (or highest)
 * average.
 *
 * Only windows that start at or after `from` and have a value in every slot
 * count: a gap in the data is not a cheap quarter hour. Of equally good
 * windows the earliest wins. Returns `null` if no window qualifies.
 */
export function bestWindow(
  values: readonly (number | null)[],
  length: number,
  options: { from?: number; pick: "lowest" | "highest" },
): BestWindow | null {
  const from = Math.max(0, options.from ?? 0);
  if (!Number.isInteger(length) || length < 1) return null;

  let best: BestWindow | null = null;
  let sum = 0;
  let missing = 0;

  // Slide the window one slot at a time, adding the slot that enters and
  // dropping the one that leaves.
  for (let end = from; end < values.length; end++) {
    const entering = values[end];
    if (entering === null || entering === undefined) missing++;
    else sum += entering;

    const start = end - length + 1;
    if (start < from) continue;

    if (missing === 0) {
      const average = sum / length;
      const better =
        best === null ||
        (options.pick === "lowest" ? average < best.average : average > best.average);
      if (better) best = { start, end: end + 1, average };
    }

    const leaving = values[start];
    if (leaving === null || leaving === undefined) missing--;
    else sum -= leaving;
  }

  return best;
}
