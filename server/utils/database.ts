import type { D1Database } from "@cloudflare/workers-types";
import type { SeriesStore } from "./store.ts";
import { createD1Store } from "./store.ts";

/** The bindings declared in wrangler.jsonc. */
export interface WorkerBindings {
  DB?: D1Database;
}

export function storeFromBindings(bindings: WorkerBindings | undefined): SeriesStore {
  if (!bindings?.DB) {
    throw new Error("The D1 binding `DB` is missing. It is declared in wrangler.jsonc.");
  }
  return createD1Store(bindings.DB);
}
