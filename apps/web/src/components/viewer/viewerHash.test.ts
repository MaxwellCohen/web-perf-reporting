import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toBase64 = vi.fn<(text: string, options?: { gzip: boolean }) => Promise<string>>(
  async (text) => text,
);
const fromBase64 = vi.fn<(encoded: string, options?: { gzip: boolean }) => string>(
  (encoded) => encoded,
);

vi.mock("@/components/viewer/textEncoding", () => ({
  TextEncoding: {
    toBase64: (text: string, options: { gzip: boolean }) => toBase64(text, options),
    fromBase64: (encoded: string, options: { gzip: boolean }) => fromBase64(encoded, options),
  },
}));

import { PageSpeedInsights } from "@/lib/schema";
import { decodeViewerHash, encodeViewerHash } from "@/components/viewer/viewerHash";

const report = { lighthouseResult: { categories: {} } } as PageSpeedInsights;

describe("viewerHash", () => {
  beforeEach(() => {
    toBase64.mockImplementation(async (text: string) => text);
    fromBase64.mockImplementation((encoded: string) => encoded);
    sessionStorage.clear();
    window.location.hash = "";
  });

  afterEach(() => {
    sessionStorage.clear();
    window.location.hash = "";
  });

  it("round-trips reports and labels through a gzipped hash fragment", async () => {
    const fragment = await encodeViewerHash({
      data: [report],
      labels: ["mobile"],
    });

    expect(toBase64).toHaveBeenCalledWith(expect.any(String), { gzip: true });
    await expect(decodeViewerHash(`#${fragment}`)).resolves.toEqual({
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["mobile"],
    });
  });

  it("decodes a legacy hash that is raw Lighthouse JSON", async () => {
    const encoded = JSON.stringify(report);

    await expect(decodeViewerHash(`#${encoded}`)).resolves.toEqual({
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["Report 1"],
    });
  });

  it("returns null for an empty hash so the input form can show", async () => {
    await expect(decodeViewerHash("")).resolves.toBeNull();
    await expect(decodeViewerHash("#")).resolves.toBeNull();
  });

  it("decodes a percent-encoded location.hash fragment", async () => {
    const encoded = encodeURIComponent(
      JSON.stringify({ v: 1, data: [report], labels: ["from-hash"] }),
    );

    await expect(decodeViewerHash(`#${encoded}`)).resolves.toEqual({
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["from-hash"],
    });
  });

  it("stores oversized payloads in sessionStorage and hashes an id, never a server URL", async () => {
    toBase64.mockResolvedValue("x".repeat(500_001));

    const fragment = await encodeViewerHash({
      data: [report],
      labels: ["desktop"],
    });

    expect(fragment.startsWith("local.")).toBe(true);
    expect(fragment.includes("http")).toBe(false);
    await expect(decodeViewerHash(`#${fragment}`)).resolves.toEqual({
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["desktop"],
    });
  });
});
