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

const BASE = "https://stromfenster.vercel.app";

const priceText = (value: number, language: "de-DE" | "en-GB") =>
  `${new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} ct/kWh`;

const dashboard = buildDashboard(
  readDayFixture("2026-11-14"),
  readDayFixture("2026-11-15"),
  API_RECORDED_AT,
);

describe("the website as the server sends it", () => {
  let api: Awaited<ReturnType<typeof startApi>>;
  let site: Awaited<ReturnType<typeof startSite>>;
  let response: Response;
  let html: string;

  const get = async (path: string) => {
    const page = await fetch(`${site.url}${path}`);
    return { status: page.status, text: await page.text() };
  };

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

  describe("the start page in German, at the root", () => {
    it("answers with a complete page", () => {
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toMatch(/<html[^>]* lang="de-DE"/);
      expect(html.match(/<h1[^>]*>Stromfenster<\/h1>/g)).toHaveLength(1);
      expect(html).toContain("<title>Stromfenster: Wann ist Strom günstig und sauber?</title>");
    });

    it("names both languages and the canonical address in its head", () => {
      expect(html).toMatch(new RegExp(`<link[^>]*rel="canonical"[^>]*href="${BASE}"`));
      expect(html).toMatch(new RegExp(`<link[^>]*href="${BASE}"[^>]*hreflang="de-DE"`));
      expect(html).toMatch(new RegExp(`<link[^>]*href="${BASE}/en"[^>]*hreflang="en-GB"`));
      expect(html).toMatch(new RegExp(`<link[^>]*href="${BASE}"[^>]*hreflang="x-default"`));
    });

    it("contains the recommendation for every duration", () => {
      const answers = [...html.matchAll(/class="when"[^>]*>([^<]+)</g)].map((match) => match[1]);

      expect(answers).toHaveLength(8);
      expect(answers).toContain("Morgen 10:45–12:45");
      for (const { cheapest } of dashboard.recommendations) {
        expect(html).toContain(`im Schnitt ${priceText(cheapest!.average, "de-DE")}`);
      }
      expect(html).toContain(`jetzt ${priceText(dashboard.currentPrice!, "de-DE")}`);
    });

    it("contains the charts as SVG, with their lines", () => {
      expect(html.match(/<svg[^>]*role="img"/g)).toHaveLength(6);
      // Price and share, each wide and narrow.
      expect(html.match(/<path[^>]*class="line"/g)).toHaveLength(4);
      // Six groups of generation, wide and narrow.
      expect(html.match(/<path[^>]*class="band band--/g)).toHaveLength(12);
      expect(html).toContain("Am günstigsten, 2 Std.");
      expect(html).toContain("Am meisten Wind und Sonne, 2 Std.");
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
      expect(html).toContain("Stundenmittel in ct/kWh");
    });

    it("contains the CO₂ estimate and the note on wholesale prices", () => {
      expect(html).toContain("CO₂ je kWh, heute bisher");
      expect(html).toMatch(/<dd[^>]*>\d+ g\/kWh<\/dd>/);
      expect(html).toContain("Deutscher Strommix 2024: 363 g/kWh");
      expect(html).toContain("Das sind Großhandelspreise.");
      expect(html).toContain('href="/methodik#co2"');
    });
  });

  describe("the start page in English, under /en", () => {
    it("answers in English with its own canonical address", async () => {
      const { status, text } = await get("/en");

      expect(status).toBe(200);
      expect(text).toMatch(/<html[^>]* lang="en-GB"/);
      expect(text).toContain("<title>Stromfenster: when is electricity cheap and clean?</title>");
      expect(text).toMatch(new RegExp(`<link[^>]*rel="canonical"[^>]*href="${BASE}/en"`));
      expect(text).toContain("Tomorrow 10:45–12:45");
      expect(text).toContain(`now ${priceText(dashboard.currentPrice!, "en-GB")}`);
      expect(text).toContain('href="/en/methodology#co2"');
    });
  });

  describe("the methodology", () => {
    it("is served in German and in English, with the factors and their source", async () => {
      const source =
        'href="https://www.umweltbundesamt.de/publikationen/entwicklung-der-spezifischen-treibhausgas-11"';
      for (const [path, heading, lignite] of [
        ["/methodik", "So werden die Zahlen berechnet", "1.119"],
        ["/en/methodology", "How the figures are calculated", "1,119"],
      ] as const) {
        const { status, text } = await get(path);

        expect(status, path).toBe(200);
        expect(text.match(new RegExp(`<h1[^>]*>${heading}</h1>`, "g"))).toHaveLength(1);
        expect(text).toContain(lignite);
        expect(text).toContain("Climate Change 13/2025");
        expect(text).toContain(source);
        expect(text).toContain('id="co2"');
        expect(text).toContain('id="prices"');
      }
    });

    it("is not answered under the address of the other language", async () => {
      const page = await fetch(`${site.url}/en/methodik`);
      await page.body?.cancel();

      expect(page.status).toBe(404);
    });

    it("sends the old English address to its new place", async () => {
      // English was at the root for a day before German moved there.
      const page = await fetch(`${site.url}/methodology`, { redirect: "manual" });
      await page.body?.cancel();

      expect(page.status).toBe(301);
      expect(page.headers.get("location")).toBe("/en/methodology");
    });
  });

  describe("the day pages", () => {
    it("show a past day in German, with its figures, charts and neighbours", async () => {
      const { status, text } = await get("/tag/2026-11-13");

      expect(status).toBe(200);
      expect(text).toMatch(/<html[^>]* lang="de-DE"/);
      expect(text.match(/<h1[^>]*>Strom am Freitag, 13\. November 2026<\/h1>/g)).toHaveLength(1);
      expect(text).toContain("Niedrigster Preis");
      expect(text).toContain("258 g/kWh");
      expect(text.match(/<svg[^>]*role="img"/g)).toHaveLength(4);
      expect(text).toMatch(/<a[^>]*href="\/tag\/2026-11-12"[^>]*rel="prev"/);
      expect(text).toMatch(/<a[^>]*href="\/tag\/2026-11-14"[^>]*rel="next"/);
      expect(text).toMatch(
        new RegExp(`<link[^>]*href="${BASE}/en/day/2026-11-13"[^>]*hreflang="en-GB"`),
      );
    });

    it("show the same day in English", async () => {
      const { status, text } = await get("/en/day/2026-11-13");

      expect(status).toBe(200);
      expect(text).toContain("Electricity on Friday, 13 November 2026");
      expect(text).toMatch(
        new RegExp(`<link[^>]*rel="canonical"[^>]*href="${BASE}/en/day/2026-11-13"`),
      );
    });

    it("describe their data for search engines", async () => {
      const { text } = await get("/tag/2026-11-13");
      const json = /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/.exec(
        text,
      )?.[1];
      const data = JSON.parse(json!);

      expect(data["@type"]).toBe("Dataset");
      expect(data.temporalCoverage).toBe("2026-11-13");
      expect(data.isBasedOn.url).toBe("https://www.smard.de");
      expect(data.isBasedOn.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    });

    it.each(["/tag/2026-11-11", "/tag/2026-11-16", "/tag/2026-02-30", "/tag/heute"])(
      "do not exist for %s",
      async (path) => {
        const page = await fetch(`${site.url}${path}`);
        await page.body?.cancel();

        expect(page.status).toBe(404);
      },
    );

    it("are linked from the start page", () => {
      expect(html).toContain('href="/tag/2026-11-13"');
    });
  });

  describe("what search engines and link previews read", () => {
    it("lists every page in both languages in the sitemap", async () => {
      const page = await fetch(`${site.url}/sitemap.xml`);
      const xml = await page.text();

      expect(page.status).toBe(200);
      expect(page.headers.get("content-type")).toContain("application/xml");
      expect(xml).toContain(`<loc>${BASE}</loc>`);
      expect(xml).toContain(`<loc>${BASE}/en/methodology</loc>`);
      // Complete days up to yesterday: the 13th, not today (the 14th).
      expect(xml).toContain(`<loc>${BASE}/tag/2026-11-13</loc>`);
      expect(xml).not.toContain("2026-11-14");
    });

    it("points robots to the sitemap", async () => {
      const { text } = await get("/robots.txt");

      expect(text).toContain(`Sitemap: ${BASE}/sitemap.xml`);
    });

    it("gives every page a preview image, title and description", async () => {
      for (const path of ["/", "/en", "/methodik", "/tag/2026-11-13"]) {
        const { text } = await get(path);

        expect(text, path).toMatch(
          new RegExp(`<meta[^>]*property="og:image"[^>]*content="${BASE}/og.png"`),
        );
        expect(text, path).toMatch(/<meta[^>]*property="og:title"[^>]*content="[^"]+"/);
        expect(text, path).toMatch(
          /<meta[^>]*name="twitter:card"[^>]*content="summary_large_image"/,
        );
      }
    });

    it("serves the preview image", async () => {
      const image = await fetch(`${site.url}/og.png`);
      const bytes = new Uint8Array(await image.arrayBuffer());

      expect(image.status).toBe(200);
      expect(image.headers.get("content-type")).toBe("image/png");
      // PNG signature.
      expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    });

    it("describes the start page's data as a Dataset", () => {
      const json = /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/.exec(
        html,
      )?.[1];
      const data = JSON.parse(json!);

      expect(data["@type"]).toBe("Dataset");
      expect(data.inLanguage).toBe("de-DE");
      expect(data.url).toBe(BASE);
      expect(data.temporalCoverage).toBe("2026-11-12/..");
    });
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
    expect(html).toContain("Die Daten sind gerade nicht verfügbar");
    expect(html).not.toContain("<svg");
  });

  it("is marked as an error that must not be cached", () => {
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
