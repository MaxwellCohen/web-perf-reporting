import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatBytesOptional,
  formatMs,
  formatMsOptional,
  shortUrl,
} from "@/features/page-speed-insights/shared/format";

describe("formatMs", () => {
  it("returns em dash for non-finite values", () => {
    expect(formatMs(Number.NaN)).toBe("—");
    expect(formatMs(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("formats under 1000 as rounded ms", () => {
    expect(formatMs(49.6)).toBe("50 ms");
    expect(formatMs(999)).toBe("999 ms");
  });

  it("formats 1000–9999.9 as seconds with 2 decimals", () => {
    expect(formatMs(1000)).toBe("1.00 s");
    expect(formatMs(2500)).toBe("2.50 s");
  });

  it("formats 10000+ as seconds with 1 decimal", () => {
    expect(formatMs(10000)).toBe("10.0 s");
    expect(formatMs(125000)).toBe("125.0 s");
  });
});

describe("formatBytes", () => {
  it("returns em dash for non-finite values", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
  });

  it("formats bytes under 1024 as B", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats KiB and MiB with 1 decimal", () => {
    expect(formatBytes(1024)).toBe("1.0 KiB");
    expect(formatBytes(2048)).toBe("2.0 KiB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MiB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MiB");
  });
});

describe("optional formatters", () => {
  it("formatMsOptional returns empty for falsy", () => {
    expect(formatMsOptional(undefined)).toBe("");
    expect(formatMsOptional(null)).toBe("");
    expect(formatMsOptional(0)).toBe("");
    expect(formatMsOptional(1500)).toBe("1.50 s");
  });

  it("formatBytesOptional returns empty for falsy", () => {
    expect(formatBytesOptional(undefined)).toBe("");
    expect(formatBytesOptional(null)).toBe("");
    expect(formatBytesOptional(0)).toBe("");
    expect(formatBytesOptional(2048)).toBe("2.0 KiB");
  });
});

describe("shortUrl", () => {
  it("shows host and truncated path", () => {
    expect(shortUrl("https://cdn.example.com/a.js")).toBe("cdn.example.com/a.js");
  });

  it("truncates long invalid urls", () => {
    const long = "x".repeat(70);
    expect(shortUrl(long)).toBe(`${"x".repeat(57)}…`);
  });
});
