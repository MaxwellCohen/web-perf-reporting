import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PERFORMANCE_AUDIT_VIZ_IDS, PerformanceAuditViz } from "./performanceAuditViz";
import { makeRow } from "./performanceVizTestUtils";

describe("PerformanceAuditViz", () => {
  it("exposes handled ids", () => {
    for (const id of [
      "server-response-time",
      "viewport-insight",
      "unsized-images",
      "non-composited-animations",
      "image-size-responsive",
      "image-aspect-ratio",
    ]) {
      expect(PERFORMANCE_AUDIT_VIZ_IDS.has(id)).toBe(true);
    }
    // cache-insight is table-only: one table per run/device, no charts.
    expect(PERFORMANCE_AUDIT_VIZ_IDS.has("cache-insight")).toBe(false);
  });

  it("dispatches and returns null for unknown ids", () => {
    const { container } = render(
      <PerformanceAuditViz rows={[makeRow("server-response-time", [{ url: "u", responseTime: 10 }])]} />,
    );
    expect(container.textContent).toContain("10 ms");
    const none = render(<PerformanceAuditViz rows={[makeRow("nope", [{ a: 1 }])]} />);
    expect(none.container.firstChild).toBeNull();
  });
});
