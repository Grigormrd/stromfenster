import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join, normalize, sep } from "node:path";
import { SMARD_FIXTURES } from "../fixtures/smard.ts";

export interface SmardServer {
  /** Use this as the SMARD base URL of the Worker under test. */
  baseUrl: string;
  /** Paths requested since the last `reset()`, with the status they got. */
  requests: { path: string; status: number }[];
  /** Serve another recording from now on. */
  use(recording: string): void;
  /** Answer with HTTP 500 for the given SMARD filters; `"all"` for every request. */
  failFor(filters: readonly number[] | "all"): void;
  reset(): void;
  close(): Promise<void>;
}

const PREFIX = "/app/chart_data/";

/**
 * A local stand-in for smard.de that serves a recording from
 * test/fixtures/smard. Files that were not recorded answer with 404, as on
 * SMARD.
 */
export async function startSmardServer(recording: string): Promise<SmardServer> {
  let current = recording;
  let failing: readonly number[] | "all" = [];
  const requests: SmardServer["requests"] = [];

  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    const answer = (status: number, body?: Buffer) => {
      requests.push({ path, status });
      response.writeHead(status, { "content-type": "application/json" });
      response.end(body);
    };

    if (!path.startsWith(PREFIX)) return answer(404);
    const relative = normalize(path.slice(PREFIX.length));
    if (relative.startsWith("..") || relative.includes(`..${sep}`)) return answer(404);

    const filter = Number(relative.split(sep)[0]);
    if (failing === "all" || failing.includes(filter)) return answer(500);

    try {
      answer(200, await readFile(join(SMARD_FIXTURES, current, relative)));
    } catch {
      answer(404);
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}${PREFIX.slice(0, -1)}`,
    requests,
    use(next) {
      current = next;
    },
    failFor(filters) {
      failing = filters;
    },
    reset() {
      requests.length = 0;
      failing = [];
    },
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
