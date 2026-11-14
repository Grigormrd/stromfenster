// Formatting for display. Every formatter names its locale and time zone, so
// the server (UTC) and the browser (anywhere) produce the same text.

const LOCALE = "en-GB";
const ZONE = "Europe/Berlin";

const time = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const weekday = new Intl.DateTimeFormat(LOCALE, { timeZone: ZONE, weekday: "long" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { timeZone: ZONE, day: "numeric", month: "long" });
const oneDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** 21:30, in Berlin time. `epochSeconds` is a moment in UTC. */
export function formatTime(epochSeconds: number): string {
  return time.format(epochSeconds * 1000);
}

/** Saturday */
export function formatWeekday(epochSeconds: number): string {
  return weekday.format(epochSeconds * 1000);
}

/** 14 November */
export function formatDayMonth(epochSeconds: number): string {
  return dayMonth.format(epochSeconds * 1000);
}

/** 18.4 */
export function formatDecimal(value: number): string {
  return oneDecimal.format(value);
}

/** 18.4 ct/kWh */
export function formatPrice(centsPerKwh: number): string {
  return `${oneDecimal.format(centsPerKwh)} ct/kWh`;
}

/** 62 %, from a share of 0.62 */
export function formatShare(share: number): string {
  return `${whole.format(share * 100)} %`;
}
