import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useFullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";

vi.mock("@/features/page-speed-insights/LighthouseAuditsPanel", () => ({
  LighthouseAuditsPanel: () => {
    const fill = useFullWidthTables();
    return (
      <div data-testid="audits-panel">
        <span data-testid="fill-width">{String(fill)}</span>
      </div>
    );
  },
}));

import { AuditsTabPanel } from "./AuditsTabPanel";

describe("AuditsTabPanel", () => {
  it("enables full-width tables for audits content", () => {
    const { container } = render(<AuditsTabPanel />);
    expect(container.querySelector('[data-testid="fill-width"]')?.textContent).toBe("true");
  });
});
