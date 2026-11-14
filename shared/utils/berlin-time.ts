/**
 * Calendar maths for the German market. Days and weeks are defined in
 * Europe/Berlin, timestamps are stored in UTC. On the days the clocks change, a
 * day has 23 or 25 hours, so nothing here assumes 24.
 *
 * All timestamps are epoch seconds.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Creating a formatter is expensive, formatting with it is not.
const berlinParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface CivilTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function berlinCivilTime(epochSeconds: number): CivilTime {
  const parts: Record<string, number> = {};
  for (const part of berlinParts.formatToParts(epochSeconds * 1000)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as unknown as CivilTime;
}

/** Seconds that Berlin is ahead of UTC at the given moment (3600 or 7200). */
function berlinOffset(epochSeconds: number): number {
  const civil = berlinCivilTime(epochSeconds);
  const asIfUtc =
    Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second) / 1000;
  return asIfUtc - epochSeconds;
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  const match = DATE_KEY.exec(dateKey);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Date.UTC rolls 2026-02-30 over into March; a real date survives the round trip.
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isReal ? { year, month, day } : null;
}

function formatDateKey(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDateKey(value: string): boolean {
  return parseDateKey(value) !== null;
}

/** The Berlin calendar date (YYYY-MM-DD) that contains the given moment. */
export function berlinDateKey(epochSeconds: number): string {
  const civil = berlinCivilTime(epochSeconds);
  return formatDateKey(civil.year, civil.month, civil.day);
}

/** The date `days` calendar days after `dateKey` (negative for earlier). */
export function addDays(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) throw new RangeError(`Not a calendar date: ${dateKey}`);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Midnight in Berlin at the start of the given date. */
export function berlinDayStart(dateKey: string): number {
  const parsed = parseDateKey(dateKey);
  if (!parsed) throw new RangeError(`Not a calendar date: ${dateKey}`);
  const utcMidnight = Date.UTC(parsed.year, parsed.month - 1, parsed.day) / 1000;
  // The offset at UTC midnight is a first guess; the second step corrects it
  // if the clocks changed between that moment and local midnight.
  const guess = utcMidnight - berlinOffset(utcMidnight);
  return utcMidnight - berlinOffset(guess);
}

/** The day as a half-open range: `start` is included, `end` is the next midnight. */
export function berlinDayRange(dateKey: string): { start: number; end: number } {
  return { start: berlinDayStart(dateKey), end: berlinDayStart(addDays(dateKey, 1)) };
}

/** Monday, midnight in Berlin, of the week that contains the given moment. */
export function berlinWeekStart(epochSeconds: number): number {
  const civil = berlinCivilTime(epochSeconds);
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const dateKey = formatDateKey(civil.year, civil.month, civil.day);
  return berlinDayStart(addDays(dateKey, -daysSinceMonday));
}

/** The start of every slot of `stepSeconds` in a half-open range. */
export function slotStarts(range: { start: number; end: number }, stepSeconds: number): number[] {
  const starts: number[] = [];
  for (let start = range.start; start < range.end; start += stepSeconds) starts.push(start);
  return starts;
}
