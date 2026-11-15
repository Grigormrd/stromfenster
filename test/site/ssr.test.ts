/**
 * What the website sends before any JavaScript runs.
 *
 * The built server is started as it is in production and asked for the start
 * page. The data API is a local server with responses recorded from the
 * deployed one, and the page is rendered for the moment they were recorded.
 *
 * Needs a build: `pnpm build` (or `pnpm check`, which builds first).
 */
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildDashboard } from "../../shared/utils/dashboard.ts";
import { API_RECORDED_AT, readDayFixture, RECORDED_DAYS } from "../fixtures/api.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const SERVER = join(ROOT, ".output", "server", "index.mjs");
const FIXED_NOW = new Date(API_RECORDED_AT * 1000).toISOString();

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

/** Serves the recorded days like the pipeline's API; anything else is a 404. */
async function startApi() {
  const server = createServer((request, response) => {
    const date = /^\/api\/days\/(\d{4}-\d{2}-\d{2})$/.exec(request.url ?? "")?.[1];
    const recorded = RECORDED_DAYS.find((day) => day === date);
    if (!recorded) {
      response.writeHead(404, { "content-type": "application/json" }).end('{"error":"Not found"}');
      return;
    }
    response
      .writeHead(200, { "content-type": "application/json" })
      .end(readFileSync(join(ROOT, "test", "fixtures", "api", `day-${recorded}.json`)));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Starts the built website against the given data API and waits until it answers. */
async function startSite(dataApiUrl: string) {
  const port = await freePort();
  const child: ChildProcess = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      NUXT_PUBLIC_DATA_API_URL: dataApiUrl,
      NUXT_PUBLIC_FIXED_NOW: FIXED_NOW,
    },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(`${url}/robots.txt`);
      return { url, stop: () => child.kill() };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  child.kill();
  throw new Error("The built website did not start.");
}

const priceText = (value: number) =>
  `${new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} ct/kWh`;

describe("the start page as the server sends it", () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  let site: Awaited<ReturnType<typeof startSite>>;
  let response: Response;
  let html: string;

  beforeAll(async () => {
    if (!existsSync(SERVER)) {
      throw new Error("No build found. Run `pnpm build` before `pnpm test:site`.");
    }
    api = await startApi();
    site = await startSite(api.url);
    response = await fetch(`${site.url}/`);
    html = await response.text();
  });

  afterAll(async () => {
    site?.stop();
    await api?.close();
  });

  it("answers with a complete page", () => {
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<html  lang="en"');
    expect(html.match(/<h1[^>]*>Stromfenster<\/h1>/g)).toHaveLength(1);
    expect(html).toContain("<title>Stromfenster: when is electricity cheap and clean?</title>");
  });

  it("contains the recommendation for every duration", () => {
    const dashboard = buildDashboard(
      readDayFixture("2026-11-14"),
      readDayFixture("2026-11-15"),
      API_RECORDED_AT,
    );
    const answers = [...html.matchAll(/class="when"[^>]*>([^<]+)</g)].map((match) => match[1]);

    expect(answers).toHaveLength(8);
    expect(answers).toContain("Tomorrow 10:45–12:45");
    for (const { cheapest } of dashboard.recommendations) {
      expect(html).toContain(`${priceText(cheapest!.average)} on average`);
    }
    expect(html).toContain(`now ${priceText(dashboard.currentPrice!)}`);
  });

  it("contains the charts as SVG, with their lines", () => {
    expect(html.match(/<svg[^>]*role="img"/g)).toHaveLength(6);
    // Price and share, each wide and narrow.
    expect(html.match(/<path[^>]*class="line"/g)).toHaveLength(4);
    // Six groups of generation, wide and narrow.
    expect(html.match(/<path[^>]*class="band band--/g)).toHaveLength(12);
    expect(html).toContain("Cheapest 2 h");
    expect(html).toContain("Most wind and solar 2 h");
  });

  it("lets the duration be chosen without JavaScript", async () => {
    // Radio buttons, two hours checked ...
    expect(html.match(/<input[^>]*name="duration"[^>]*>/g)).toHaveLength(4);
    expect(html.match(/<input[^>]*name="duration"[^>]*checked[^>]*>/g)).toHaveLength(1);
    expect(html).toMatch(/<input[^>]*id="duration-2"[^>]*checked/);

    // ... and a style rule that shows what belongs to the checked one.
    const stylesheets = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(
      (match) => match[1]!,
    );
    const css = [
      html,
      ...(await Promise.all(
        stylesheets.map(async (href) => (await fetch(new URL(href, site.url))).text()),
      )),
    ].join("\n");
    expect(css).toMatch(/:has\(#duration-2:checked\) \[data-duration=['"]?2['"]?\]/);
    expect(css).toMatch(/\[data-duration\]\s*\{\s*display:\s*none/);
  });

  it("contains a table for every chart", () => {
    expect(html.match(/<table/g)).toHaveLength(3);
    expect(html).toContain("Hourly mean in ct/kWh");
  });

  it("contains the CO₂ estimate and the note on wholesale prices", () => {
    expect(html).toContain("CO₂ per kWh, today so far");
    expect(html).toMatch(/<dd[^>]*>\d+ g\/kWh<\/dd>/);
    expect(html).toContain("German mix in 2024: 363 g/kWh");
    expect(html).toContain("These are wholesale prices.");
    expect(html).toContain('href="/methodology#co2"');
  });

  it("serves the methodology page with the emission factors and their source", async () => {
    const page = await fetch(`${site.url}/methodology`);
    const text = await page.text();

    expect(page.status).toBe(200);
    expect(text.match(/<h1[^>]*>How the figures are calculated<\/h1>/g)).toHaveLength(1);
    expect(text).toContain("1,119");
    expect(text).toContain("Climate Change 13/2025");
    expect(text).toContain(
      'href="https://www.umweltbundesamt.de/publikationen/entwicklung-der-spezifischen-treibhausgas-11"',
    );
    expect(text).toContain('id="co2"');
    expect(text).toContain('id="prices"');
  });
});

describe("the start page when the data API cannot be reached", () => {
  let site: Awaited<ReturnType<typeof startSite>>;
  let response: Response;
  let html: string;

  beforeAll(async () => {
    // Nothing listens on this port.
    site = await startSite(`http://127.0.0.1:${await freePort()}`);
    response = await fetch(`${site.url}/`);
    html = await response.text();
  });

  afterAll(() => site?.stop());

  it("says that the data is unavailable", () => {
    expect(html).toContain("The data is not available right now");
    expect(html).not.toContain("<svg");
  });

  it("is marked as an error that must not be cached", () => {
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
