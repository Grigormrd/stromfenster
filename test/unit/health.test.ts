import { describe, expect, it } from "vitest";
import { healthStatus } from "../../worker/src/health.ts";

describe("healthStatus", () => {
  it("reports ok with the given time in UTC", () => {
    const now = new Date("2026-11-14T10:15:00+01:00");

    expect(healthStatus(now)).toEqual({ status: "ok", time: "2026-11-14T09:15:00.000Z" });
  });
});
