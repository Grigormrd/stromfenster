import type { WorkerBindings } from "../utils/database.ts";

// Run by the Cron Trigger (see server/plugins/scheduled-import.ts). In
// development it can be started by hand: GET /_nitro/tasks/import
export default defineTask({
  meta: {
    name: "import",
    description: "Import new and corrected values from SMARD",
  },
  async run({ payload, context }) {
    // Set by the plugin for scheduled runs; in development Nitro keeps the
    // bindings in a global.
    const { cloudflare } = context as { cloudflare?: { env?: WorkerBindings } };
    const bindings = cloudflare?.env ?? (globalThis as { __env__?: WorkerBindings }).__env__;
    const scheduledTime =
      typeof payload.scheduledTime === "number" ? payload.scheduledTime : Date.now();

    const run = await runImport({
      store: storeFromBindings(bindings),
      fetchJson: fetchJsonOverHttp,
      baseUrl: useRuntimeConfig().smardBaseUrl,
      now: Math.floor(scheduledTime / 1000),
    });

    if (run.status !== "ok") console.error("Import finished with problems", run);
    // A failed run should show up as a failed invocation in the Cloudflare dashboard.
    if (run.status === "failed") throw new Error("Import failed", { cause: run.failures });
    return { result: run };
  },
});
