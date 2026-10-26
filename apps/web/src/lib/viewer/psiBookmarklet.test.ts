import { describe, expect, it } from "vitest";
import {
  buildPsiViewerBookmarklet,
  buildPsiViewerDeepLink,
} from "@/lib/viewer/psiBookmarklet";

describe("buildPsiViewerDeepLink", () => {
  it("builds a viewer URL with the PSI share as a query param", () => {
    expect(
      buildPsiViewerDeepLink(
        "https://pagespeed.web.dev/analysis/https-example-com/abc",
        "https://web-perf-report.vercel.app",
      ),
    ).toBe(
      "https://web-perf-report.vercel.app/viewer?psi=https%3A%2F%2Fpagespeed.web.dev%2Fanalysis%2Fhttps-example-com%2Fabc",
    );
  });

  it("includes optional compare URL and run labels", () => {
    expect(
      buildPsiViewerDeepLink(
        "https://pagespeed.web.dev/analysis/https-example-com/a",
        "https://web-perf-report.vercel.app",
        {
          label: "Before",
          compareUrl: "https://pagespeed.web.dev/analysis/https-example-com/b",
          compareLabel: "After",
        },
      ),
    ).toBe(
      "https://web-perf-report.vercel.app/viewer?psi=https%3A%2F%2Fpagespeed.web.dev%2Fanalysis%2Fhttps-example-com%2Fa&psiLabel=Before&psi2=https%3A%2F%2Fpagespeed.web.dev%2Fanalysis%2Fhttps-example-com%2Fb&psi2Label=After",
    );
  });
});

describe("buildPsiViewerBookmarklet", () => {
  it("opens the viewer with the current PSI share URL", () => {
    const href = buildPsiViewerBookmarklet();
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).toContain("https://web-perf-report.vercel.app/viewer?psi=");
    expect(href).toContain("pagespeed\\.web\\.dev");
    expect(href).toContain("encodeURIComponent(u)");
  });
});
