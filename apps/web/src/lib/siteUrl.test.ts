import { afterEach, describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/siteUrl";

describe("getSiteUrl", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalVercelUrl = process.env.VERCEL_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = originalVercelUrl;
    }
  });

  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    delete process.env.VERCEL_URL;

    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("falls back to VERCEL_URL when NEXT_PUBLIC_SITE_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "web-perf-reporting.vercel.app";

    expect(getSiteUrl()).toBe("https://web-perf-reporting.vercel.app");
  });

  it("falls back to localhost when no env vars are set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
