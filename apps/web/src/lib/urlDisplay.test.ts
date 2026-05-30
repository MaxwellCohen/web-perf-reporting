import { describe, expect, it } from "vitest";
import { getHostnameFromUrl, parseUrlForDisplay } from "@/lib/urlDisplay";

describe("parseUrlForDisplay", () => {
  it("returns parsed URL for valid URL with path", () => {
    const result = parseUrlForDisplay("https://example.com/path/to/page");
    expect(result).toEqual({
      path: "/path/to/page",
      hostLabel: "(example.com)",
      hostname: "example.com",
    });
  });

  it("returns origin as path and empty hostLabel when pathname is root", () => {
    const result = parseUrlForDisplay("https://example.com/");
    expect(result).toEqual({
      path: "https://example.com",
      hostLabel: "",
      hostname: "example.com",
    });
  });

  it("returns empty hostLabel when hostname is empty", () => {
    const result = parseUrlForDisplay("file:///path/to/file");
    expect(result?.hostname).toBe("");
    expect(result?.hostLabel).toBe("");
  });

  it("returns null for invalid URL", () => {
    expect(parseUrlForDisplay("not-a-url")).toBeNull();
    expect(parseUrlForDisplay("")).toBeNull();
  });
});

describe("getHostnameFromUrl", () => {
  it("returns hostname for valid URL", () => {
    expect(getHostnameFromUrl("https://example.com/page")).toBe("example.com");
  });

  it("returns fallback for invalid URL", () => {
    expect(getHostnameFromUrl("invalid")).toBe("Unknown");
  });

  it("returns custom fallback when provided", () => {
    expect(getHostnameFromUrl("invalid", "Custom")).toBe("Custom");
  });
});
