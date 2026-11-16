// Formatting for display. Every formatter names its locale and time zone, so
// the server (UTC) and the browser (anywhere) produce the same text.

const ZONE = "Europe/Berlin";

export type Language = "de-DE" | "en-GB";

export interface Formatters {
  /** 21:30, in Berlin time. `epochSeconds` is a moment in UTC. */
  time(epochSeconds: number): string;
  /** Saturday · Samstag */
  weekday(epochSeconds: number): string;
  /** 14 November · 14. November */
  dayMonth(epochSeconds: number): string;
  /** Saturday, 14 November 2026 · Samstag, 14. November 2026 */
  fullDate(epochSeconds: number): string;
  /** 18.4 · 18,4 */
  decimal(value: number): string;
  /** 258 */
  whole(value: number): string;
  /** 18.4 ct/kWh · 18,4 ct/kWh */
  price(centsPerKwh: number): string;
  /** 62 %, from a share of 0.62 */
  share(share: number): string;
  /** 258 g/kWh */
  grams(gramsPerKwh: number): string;
}

function create(language: Language): Formatters {
  const time = new Intl.DateTimeFormat(language, {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const weekday = new Intl.DateTimeFormat(language, { timeZone: ZONE, weekday: "long" });
  const dayMonth = new Intl.DateTimeFormat(language, {
    timeZone: ZONE,
    day: "numeric",
    month: "long",
  });
  const fullDate = new Intl.DateTimeFormat(language, {
    timeZone: ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const oneDecimal = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const whole = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });

  return {
    time: (epochSeconds) => time.format(epochSeconds * 1000),
    weekday: (epochSeconds) => weekday.format(epochSeconds * 1000),
    dayMonth: (epochSeconds) => dayMonth.format(epochSeconds * 1000),
    fullDate: (epochSeconds) => fullDate.format(epochSeconds * 1000),
    decimal: (value) => oneDecimal.format(value),
    whole: (value) => whole.format(value),
    price: (centsPerKwh) => `${oneDecimal.format(centsPerKwh)} ct/kWh`,
    share: (share) => `${whole.format(share * 100)} %`,
    grams: (gramsPerKwh) => `${whole.format(gramsPerKwh)} g/kWh`,
  };
}

// Creating Intl formatters is expensive; there are only two languages.
const cache = new Map<Language, Formatters>();

export function formattersFor(language: Language): Formatters {
  let formatters = cache.get(language);
  if (!formatters) {
    formatters = create(language);
    cache.set(language, formatters);
  }
  return formatters;
}
