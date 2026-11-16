import type { Language } from "~/utils/format";

/** Number, date and time formatting for the language the page is shown in. */
export function useFormatters() {
  const { localeProperties } = useI18n();
  return computed(() => formattersFor((localeProperties.value.language ?? "de-DE") as Language));
}
