import { berlinDayRange, isDateKey } from "#shared/utils/berlin-time";

// All series of one calendar day in Berlin, on a quarter-hour grid.
export default defineEventHandler(async (event) => {
  const date = getRouterParam(event, "date") ?? "";
  if (!isDateKey(date)) {
    throw createError({ statusCode: 400, statusMessage: "Expected a date as YYYY-MM-DD" });
  }

  const store = storeFromBindings(event.context.cloudflare?.env);
  const { start, end } = berlinDayRange(date);
  return buildDay(date, await store.readRange(start, end));
});
