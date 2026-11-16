import { addDays, berlinDateKey } from "#shared/utils/berlin-time";

// Lists every page in both languages. Day pages run up to yesterday: today is
// on the start page, and its day page is not complete yet.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const now = config.public.fixedNow
    ? Date.parse(config.public.fixedNow) / 1000
    : Math.floor(Date.now() / 1000);

  setResponseHeader(event, "content-type", "application/xml; charset=utf-8");
  return sitemapXml(sitemapPages(addDays(berlinDateKey(now), -1)));
});
