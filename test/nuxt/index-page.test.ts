import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";

describe("start page", () => {
  it("renders the project name as the only top-level heading", async () => {
    const page = await mountSuspended(IndexPage);

    const headings = page.findAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe("Stromfenster");
  });

  it("says what the project is about", async () => {
    const page = await mountSuspended(IndexPage);

    expect(page.text()).toContain("When is electricity in Germany cheap and clean?");
  });
});
