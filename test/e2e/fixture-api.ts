/**
 * Stands in for the pipeline's API during the end-to-end tests: serves the
 * days recorded from the deployed API, so the pages always show the same data.
 *
 *   node test/e2e/fixture-api.ts <port>
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { RECORDED_DAYS } from "../fixtures/api.ts";

const port = Number(process.argv[2] ?? 4310);
const fixtures = join(import.meta.dirname, "..", "fixtures", "api");

createServer((request, response) => {
  // The browser fetches days itself when a visitor moves between day pages.
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  };
  const path = new URL(request.url ?? "/", "http://localhost").pathname;

  if (path === "/health") {
    response.writeHead(200, headers).end('{"status":"ok"}');
    return;
  }
  const date = /^\/api\/days\/(\d{4}-\d{2}-\d{2})$/.exec(path)?.[1];
  const recorded = RECORDED_DAYS.find((day) => day === date);
  if (!recorded) {
    response.writeHead(404, headers).end('{"error":"Not found"}');
    return;
  }
  response.writeHead(200, headers).end(readFileSync(join(fixtures, `day-${recorded}.json`)));
}).listen(port, "127.0.0.1", () => {
  console.log(`fixture API on http://127.0.0.1:${port}`);
});
