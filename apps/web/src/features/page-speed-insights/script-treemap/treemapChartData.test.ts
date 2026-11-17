import { describe, expect, it } from "vitest";
import {
  getTreemapDisplayLabel,
  getTreemapLabel,
} from "@/features/page-speed-insights/script-treemap/treemapChartData";

describe("getTreemapDisplayLabel", () => {
  it("returns short inline names unchanged", () => {
    expect(getTreemapDisplayLabel("(inline) foo")).toEqual({
      primary: "(inline) foo",
    });
  });

  it("keeps the (inline) prefix when truncating", () => {
    expect(getTreemapDisplayLabel("(inline) self.__next_f.push([1, null])", 18)).toEqual({
      primary: "(inline) self.__n…",
    });
  });

  it("prioritizes path segments for URLs", () => {
    expect(getTreemapDisplayLabel("https://www.example.com/static/chunks/app-page.js", 40)).toEqual(
      {
        primary: "/chunks/app-page.js",
        secondary: "www.example.com",
      },
    );
  });

  it("uses the hostname when the URL path is only /", () => {
    expect(getTreemapDisplayLabel("https://www.clearchoice.com/", 40)).toEqual({
      primary: "www.clearchoice.com",
    });
  });

  it("keeps useful id query params and drops noisy search strings", () => {
    expect(
      getTreemapDisplayLabel(
        "https://www.googletagmanager.com/gtag/js?id=GTM-PLB42T&l=dataLayer&cx=c",
        28,
      ),
    ).toEqual({
      primary: "/gtag/js?id=GTM-PLB42T",
      secondary: "www.googletagmanager.com",
    });
  });

  it("preserves the filename when truncating long paths", () => {
    const label = getTreemapDisplayLabel(
      "https://www.example.com/very/long/path/to/a/script/file.js",
      24,
    );

    expect(label.primary.endsWith("file.js")).toBe(true);
    expect(label.primary.includes("/")).toBe(true);
    expect(label.secondary).toBe("www.example.com");
  });
});

describe("getTreemapLabel", () => {
  it("returns short names unchanged", () => {
    expect(getTreemapLabel("(inline) foo")).toBe("(inline) foo");
  });

  it("returns path-first label for URLs", () => {
    const label = getTreemapLabel("https://www.example.com/very/long/path/to/a/script/file.js", 40);
    expect(label.startsWith("/")).toBe(true);
    expect(label.includes("file.js")).toBe(true);
  });

  it("truncates long non-url strings from the end", () => {
    const label = getTreemapLabel("abcdefghijklmnopqrstuvwxyz", 10);
    expect(label).toBe("abcdefghi…");
  });
});
