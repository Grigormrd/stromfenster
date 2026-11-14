import type { DayData } from "#shared/utils/day-data";

// How old the data may get in an open tab before it is fetched again.
const REFRESH_AFTER_SECONDS = 15 * 60;

const currentSeconds = () => Math.floor(Date.now() / 1000);

/**
 * The data behind the start page: today and tomorrow from the pipeline's API,
 * and the moment the page is rendered for.
 *
 * On the server this runs once per render; the result and the time travel to
 * the browser with the page, so hydration shows exactly what the server drew.
 * Vercel may serve a cached page for a while, so the browser checks the age of
 * what it was given and fetches again if it is old.
 *
 * Everything that needs the component or the request is set up here, before
 * anything is awaited; the page awaits `ready`. After an `await` inside a
 * composable, Vue and Nuxt no longer know which component is being set up.
 */
export function useDashboard() {
  const config = useRuntimeConfig();
  const fixedNow = config.public.fixedNow ? Date.parse(config.public.fixedNow) / 1000 : null;

  const now = useState<number>("dashboard-now", () => fixedNow ?? currentSeconds());

  const request = useAsyncData("dashboard-days", async () => {
    const today = berlinDateKey(now.value);
    const day = (date: string) =>
      $fetch<DayData>(`${config.public.dataApiUrl}/api/days/${date}`, { timeout: 8000 });
    const [todayData, tomorrowData] = await Promise.all([day(today), day(addDays(today, 1))]);
    return { today: todayData, tomorrow: tomorrowData, fetchedAt: now.value };
  });
  const { data, error, refresh } = request;

  const dashboard = computed(() =>
    data.value ? buildDashboard(data.value.today, data.value.tomorrow, now.value) : null,
  );

  const event = import.meta.server ? useRequestEvent() : undefined;
  const cacheControl = import.meta.server ? useResponseHeader("cache-control") : undefined;

  const ready = request.then(() => {
    if (!error.value) return;
    // Not a page worth caching: say so, and let the next request try again.
    if (event) setResponseStatus(event, 503);
    if (cacheControl) cacheControl.value = "no-store";
  });

  onMounted(() => {
    if (fixedNow !== null) return;
    const update = () => {
      now.value = currentSeconds();
      const shown = data.value;
      const outdated =
        !shown ||
        shown.today.date !== berlinDateKey(now.value) ||
        now.value - shown.fetchedAt > REFRESH_AFTER_SECONDS;
      if (outdated && document.visibilityState === "visible") void refresh();
    };
    update();
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    onBeforeUnmount(() => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    });
  });

  return { dashboard, now, data, error, ready };
}
