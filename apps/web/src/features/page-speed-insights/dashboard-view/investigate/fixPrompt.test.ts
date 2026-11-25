import { describe, expect, it } from "vitest";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";

describe("buildFixPrompt", () => {
  it("includes page, device, evidence, fix, and verification", () => {
    const prompt = buildFixPrompt({
      url: "https://example.com/",
      formFactor: "mobile",
      metric: "LCP",
      title: "Render blocking requests",
      evidence: [{ k: "URL", v: "https://example.com/a.css" }],
      fix: "Inline critical CSS.",
      auditId: "render-blocking-insight",
    });
    expect(prompt).toContain("https://example.com/");
    expect(prompt).toContain("mobile");
    expect(prompt).toContain("- URL: https://example.com/a.css");
    expect(prompt).toContain("Inline critical CSS.");
    expect(prompt).toContain("render-blocking-insight");
    expect(prompt).toMatch(/re-run Lighthouse/i);
  });
});
