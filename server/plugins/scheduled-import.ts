// Connects the Cron Trigger (wrangler.jsonc) to the import task.
//
// Nitro can map cron expressions to tasks by itself (`scheduledTasks`), but it
// does not pass on the time the run was scheduled for. The import uses that
// time as "now", which also lets a test run it for a recorded moment.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ controller, env }) => {
    await runTask("import", {
      payload: { scheduledTime: controller.scheduledTime },
      context: { cloudflare: { env } },
    });
  });
});
