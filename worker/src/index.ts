/**
 * The data pipeline: a Cloudflare Worker without a framework.
 *
 * - The Cron Trigger imports new and corrected values from SMARD into D1.
 * - A small JSON API serves them to the website, which is rendered elsewhere.
 *
 * Keeping this Worker small is the point: on the free plan an invocation has
 * 10 ms of CPU time, and that includes starting the Worker (see docs/adr/0004).
 */
import type { D1Database } from "@cloudflare/workers-types";
import { berlinDayRange, isDateKey } from "../../shared/utils/berlin-time.ts";
import { SERIES_IDS } from "../../shared/utils/series.ts";
import type { SeriesId } from "../../shared/utils/series.ts";
import { buildDay, SOURCE } from "./day.ts";
import { healthStatus } from "./health.ts";
import { runImport } from "./import.ts";
import { summariseRuns } from "./run-summary.ts";
import { fetchJsonOverHttp, SMARD_BASE_URL } from "./smard.ts";
import { createD1Store } from "./store.ts";

export interface Env {
  DB: D1Database;
  /** Where the import reads from; tests point this at recorded responses. */
  SMARD_BASE_URL?: string;
}

const SUMMARY_HOURS = 48;
// One run every 15 minutes; a few more in case runs were started by hand.
const RUNS_TO_READ = SUMMARY_HOURS * 4 + 8;

const iso = (epochSeconds: number) => new Date(epochSeconds * 1000).toISOString();

function json(body: unknown, init: { status?: number; maxAge?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // The data is public; any site may read it.
      "access-control-allow-origin": "*",
      "cache-control": init.maxAge ? `public, max-age=${init.maxAge}` : "no-store",
    },
  });
}

const index = () =>
  json(
    {
      name: "Stromfenster data API",
      description:
        "Electricity market data for Germany in 15-minute resolution: day-ahead price, generation per source, load and forecasts.",
      routes: {
        "/api/days/YYYY-MM-DD": "All series for one calendar day in Berlin",
        "/api/status": "The last import and a summary of the last 48 hours",
        "/api/health": "Liveness check",
      },
      source: SOURCE,
    },
    { maxAge: 3600 },
  );

async function day(env: Env, date: string): Promise<Response> {
  if (!isDateKey(date)) return json({ error: "Expected a date as YYYY-MM-DD" }, { status: 400 });
  const { start, end } = berlinDayRange(date);
  const points = await createD1Store(env.DB).readRange(start, end);
  return json(buildDay(date, points), { maxAge: 60 });
}

async function status(env: Env): Promise<Response> {
  const store = createD1Store(env.DB);
  const [runs, latestStarts] = await Promise.all([
    store.recentRuns(RUNS_TO_READ),
    store.latestStarts(),
  ]);
  const lastRun = runs[0];

  const latest = {} as Record<SeriesId, string | null>;
  for (const id of SERIES_IDS) {
    const start = latestStarts[id];
    latest[id] = start === undefined ? null : iso(start);
  }

  return json({
    lastImport: lastRun
      ? {
          ranAt: iso(lastRun.ranAt),
          durationMs: lastRun.durationMs,
          status: lastRun.status,
          inserted: lastRun.inserted,
          updated: lastRun.updated,
          rowsRead: lastRun.rowsRead,
          rowsWritten: lastRun.rowsWritten,
          failures: lastRun.failures,
        }
      : null,
    recent: summariseRuns(runs, Math.floor(Date.now() / 1000), SUMMARY_HOURS),
    latest,
  });
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Only GET is supported" }, { status: 405 });
  }
  const { pathname } = new URL(request.url);

  if (pathname === "/") return index();
  if (pathname === "/api/health") return json(healthStatus());
  if (pathname === "/api/status") return status(env);
  const dayMatch = /^\/api\/days\/([^/]+)$/.exec(pathname);
  if (dayMatch) return day(env, decodeURIComponent(dayMatch[1] ?? ""));

  return json({ error: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      console.error("Request failed", error);
      return json({ error: "Internal error" }, { status: 500 });
    }
  },

  // The scheduled time is the import's clock. A test can therefore run the
  // import for the moment a recording was made.
  async scheduled(controller: { scheduledTime: number }, env: Env): Promise<void> {
    const run = await runImport({
      store: createD1Store(env.DB),
      fetchJson: fetchJsonOverHttp,
      baseUrl: env.SMARD_BASE_URL ?? SMARD_BASE_URL,
      now: Math.floor(controller.scheduledTime / 1000),
    });

    if (run.status !== "ok") console.error("Import finished with problems", run);
    // A failed run should show up as a failed invocation in the Cloudflare dashboard.
    if (run.status === "failed") throw new Error("Import failed", { cause: run.failures });
  },
};
