import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditGanttStrip } from "./AuditGanttStrip";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

function row(label: string, items: Array<Record<string, unknown>>): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: { id: "long-tasks", details: { type: "table", items } },
  } as unknown as DetailTableItem;
}

describe("AuditGanttStrip", () => {
  it("draws a time scale from the first task start to the last task end", () => {
    render(
      <AuditGanttStrip
        rows={[
          row("Mobile", [
            { url: "https://example.com/a.js", startTime: 1000, duration: 200 },
            { url: "https://example.com/b.js", startTime: 1600, duration: 400 },
          ]),
        ]}
        labelKeys={["url"]}
      />,
    );

    const axis = screen.getByTestId("gantt-axis");
    expect(within(axis).getByText("Time since page load started")).toBeInTheDocument();
    expect(within(axis).getByText("1.00 s")).toBeInTheDocument();
    expect(within(axis).getByText("1.50 s")).toBeInTheDocument();
    expect(within(axis).getByText("2.00 s")).toBeInTheDocument();
  });

  it("gives each report its own scale", () => {
    render(
      <AuditGanttStrip
        rows={[
          row("Mobile", [{ url: "https://example.com/a.js", startTime: 0, duration: 400 }]),
          row("Desktop", [{ url: "https://example.com/a.js", startTime: 0, duration: 800 }]),
        ]}
        labelKeys={["url"]}
      />,
    );

    const [mobile, desktop] = screen.getAllByTestId("gantt-axis");
    expect(within(mobile!).getByText("400 ms")).toBeInTheDocument();
    expect(within(desktop!).getByText("800 ms")).toBeInTheDocument();
  });

  it("renders nothing without tasks", () => {
    const { container } = render(<AuditGanttStrip rows={[row("Mobile", [])]} />);
    expect(container.firstChild).toBeNull();
  });
});
