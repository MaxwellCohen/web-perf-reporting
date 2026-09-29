import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MainThreadWorkCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkCard";
import { DetailTable } from "@/features/page-speed-insights/lh-categories/table/RenderTable";
import type { TableItem } from "@/lib/schema";

function item(groupLabel: string, duration: number): TableItem {
  return { group: groupLabel, groupLabel, duration };
}

describe("MainThreadWorkCard", () => {
  it("returns null when no metrics have mainThreadWork items", () => {
    const { container } = render(
      <MainThreadWorkCard
        metrics={[
          { label: "Mobile", mainThreadWork: [] },
          { label: "Desktop", mainThreadWork: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a category column and one time spent column per report", () => {
    const { container } = render(
      <MainThreadWorkCard
        metrics={[
          {
            label: "Desktop",
            mainThreadWork: [item("Parse HTML & CSS", 8)],
          },
          {
            label: "Mobile",
            mainThreadWork: [item("Parse HTML & CSS", 9)],
          },
        ]}
      />,
    );

    const headers = [...container.querySelectorAll("th")].map((header) => header.textContent);
    expect(headers).toEqual(["Category〰︎", "Mobile Time Spent〰︎", "Desktop Time Spent〰︎"]);
    expect(container.textContent).toContain("Parse HTML & CSS");
    expect(container.textContent).toContain("9 ms");
    expect(container.textContent).toContain("8 ms");
    expect(container.textContent).not.toContain("(Mobile)");
  });

  it("renders the audit table as category plus one time spent column per report", () => {
    const rows = ["Desktop", "Mobile"].map((label, index) => ({
      _userLabel: label,
      auditResult: {
        id: "mainthread-work-breakdown",
        details: {
          type: "table" as const,
          headings: [
            { key: "groupLabel", valueType: "text" as const, label: "Category" },
            { key: "duration", valueType: "ms" as const, label: "Time Spent" },
          ],
          items: [
            {
              group: "parseHTML",
              groupLabel: "Parse HTML & CSS",
              duration: index === 0 ? 8 : 9,
            },
          ],
        },
      },
    }));

    const { container } = render(
      <DetailTable rows={rows} title="Minimize main-thread work" />,
    );

    const headers = [...container.querySelectorAll("th")].map((header) => header.textContent);
    expect(headers).toEqual(["Category〰︎", "Mobile Time Spent〰︎", "Desktop Time Spent〰︎"]);
    expect(container.textContent).toContain("9 ms");
    expect(container.textContent).toContain("8 ms");
    expect(container.textContent).not.toContain("(Mobile)");
    expect(container.querySelector("tbody button")).toBeNull();
  });
});
