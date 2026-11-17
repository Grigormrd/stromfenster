import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";
import { readDayFixture } from "../fixtures/api";

// Today answers, tomorrow does not: the page needs both.
registerEndpoint("/api/days/2026-11-14", () => readDayFixture("2026-11-14"));
registerEndpoint("/api/days/2026-11-15", () => {
  throw createError({ statusCode: 500, statusMessage: "Internal error" });
});

describe("start page when the data API fails", () => {
  it("says so instead of showing charts", async () => {
    const page = await mountSuspended(IndexPage, { route: "/" });

    expect(page.find(".unavailable").text()).toContain("Die Daten sind gerade nicht verfügbar");
    expect(page.find('svg[role="img"]').exists()).toBe(false);
    expect(page.find("section.best").exists()).toBe(false);
  });

  it("says so in English under /en", async () => {
    const page = await mountSuspended(IndexPage, { route: "/en" });

    expect(page.find(".unavailable").text()).toContain("The data is not available right now");
  });

  it("keeps its heading and the source", async () => {
    const page = await mountSuspended(IndexPage, { route: "/" });

    expect(page.find("h1").text()).toBe("Stromfenster");
    expect(page.find("footer").text()).toContain("Bundesnetzagentur | SMARD.de");
  });
});
