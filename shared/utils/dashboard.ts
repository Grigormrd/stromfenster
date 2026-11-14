import type { BestWindow } from "./best-window.ts";
import { bestWindow } from "./best-window.ts";
import type { DayData } from "./day-data.ts";
import type { Mix } from "./mix.ts";
import { generationMix, measuredSlots } from "./mix.ts";
import type { Timeline } from "./timeline.ts";
import { buildTimeline, slotAt } from "./timeline.ts";

/** How long the appliance runs, in hours. The reader picks one. */
export const DURATIONS = [1, 2, 3, 4] as const;
export type Duration = (typeof DURATIONS)[number];

export interface Recommendation {
  duration: Duration;
  /** The window with the lowest average price, or `null` if none fits into the known prices. */
  cheapest: BestWindow | null;
  /** The window with the highest expected share of wind and solar. */
  cleanest: BestWindow | null;
}

export interface Dashboard {
  /** Today and tomorrow in Berlin, end to end. */
  timeline: Timeline;
  /** The quarter hour that contains `now`, or -1. */
  nowSlot: number;
  /** Price of the current quarter hour in ct/kWh. */
  currentPrice: number | null;
  /** One entry per duration, for windows starting with the next quarter hour. */
  recommendations: Recommendation[];
  /** Whether tomorrow's prices have been published (around 13:00 on the day before). */
  hasTomorrow: boolean;
  /** Slots of today: where tomorrow begins on the timeline. */
  todaySlots: number;
  /** Measured generation of today in GW, and how many quarter hours of it exist. */
  mix: Mix;
  mixSlots: number;
  /**
   * True when there is no price for the current quarter hour: the import has
   * fallen behind, or the page is being shown long after it was rendered.
   */
  stale: boolean;
}

/** Everything the start page shows, from the two days and the current time (epoch seconds). */
export function buildDashboard(today: DayData, tomorrow: DayData, now: number): Dashboard {
  const timeline = buildTimeline([today, tomorrow]);
  const nowSlot = slotAt(timeline, now);
  // A window that has already begun is not a recommendation: start with the
  // next quarter hour.
  const from = nowSlot + 1;
  const slotsPerHour = 3600 / timeline.step;

  const recommendations = DURATIONS.map((duration) => ({
    duration,
    cheapest: bestWindow(timeline.price, duration * slotsPerHour, { from, pick: "lowest" }),
    cleanest: bestWindow(timeline.windSolarShare, duration * slotsPerHour, {
      from,
      pick: "highest",
    }),
  }));

  const currentPrice = nowSlot >= 0 ? (timeline.price[nowSlot] ?? null) : null;
  const mix = generationMix(today);

  return {
    timeline,
    nowSlot,
    currentPrice,
    recommendations,
    hasTomorrow: timeline.price.slice(today.slots).some((price) => price !== null),
    todaySlots: today.slots,
    mix,
    mixSlots: measuredSlots(mix),
    stale: currentPrice === null,
  };
}
