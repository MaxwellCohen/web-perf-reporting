import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO metadata routes", () => {
  it("exports robots rules with a sitemap reference", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/monitoring", "/page-speed/"],
      },
      sitemap: expect.stringMatching(/\/sitemap\.xml$/),
    });
  });

  it("lists the public marketing and tool pages", () => {
    const entries = sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "http://localhost:3000",
      "http://localhost:3000/latest-crux",
      "http://localhost:3000/historical-crux",
      "http://localhost:3000/page-speed",
      "http://localhost:3000/viewer",
      "http://localhost:3000/lh",
    ]);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
  });
});
