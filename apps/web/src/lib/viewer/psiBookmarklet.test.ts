import { describe, expect, it } from "vitest";
import { buildPsiViewerBookmarklet } from "@/lib/viewer/psiBookmarklet";

describe("buildPsiViewerBookmarklet", () => {
  it("opens the viewer with the current PSI share URL", () => {
    const href = buildPsiViewerBookmarklet();
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).toContain("https://web-perf-report.vercel.app/viewer?psi=");
    expect(href).toContain("pagespeed\\.web\\.dev");
    expect(href).toContain("encodeURIComponent(u)");
  });
});
