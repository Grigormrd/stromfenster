import type { Ref } from "vue";

/**
 * Lets a chart be read with the keyboard: Tab focuses it, the arrow keys move
 * a marker one quarter hour, Page Up and Page Down one hour, Home and End to
 * the ends, Escape hides it. The marker is the same one the mouse moves, so
 * the tooltip shows the value; a live region reads it out.
 */
export function useChartKeyboard(options: {
  /** The quarter hour under the marker; shared with the pointer handling. */
  hovered: Ref<number | null>;
  /** How many quarter hours can be visited. */
  count: () => number;
  /** Where the marker starts when the chart is focused. */
  start: () => number;
}) {
  /** True while the marker was last moved with the keyboard. */
  const byKeyboard = ref(false);

  const clamp = (slot: number) => Math.min(Math.max(slot, 0), options.count() - 1);

  function onFocus(event: FocusEvent) {
    // A click also focuses the chart; the marker only appears for the keyboard.
    if (!(event.target as Element).matches(":focus-visible") || options.count() === 0) return;
    byKeyboard.value = true;
    options.hovered.value = clamp(options.start());
  }

  function onKeydown(event: KeyboardEvent) {
    const count = options.count();
    if (count === 0) return;
    const current = options.hovered.value ?? clamp(options.start());
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      PageDown: current + 4,
      PageUp: current - 4,
      Home: 0,
      End: count - 1,
    };
    if (event.key === "Escape") {
      options.hovered.value = null;
      return;
    }
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    byKeyboard.value = true;
    options.hovered.value = clamp(next);
  }

  function onBlur() {
    byKeyboard.value = false;
    options.hovered.value = null;
  }

  /** The pointer took over: stop announcing. */
  function onPointer() {
    byKeyboard.value = false;
  }

  return { byKeyboard, onFocus, onKeydown, onBlur, onPointer };
}
