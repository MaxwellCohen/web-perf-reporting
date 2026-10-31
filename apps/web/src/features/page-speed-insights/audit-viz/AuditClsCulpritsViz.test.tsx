import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditClsCulpritsViz } from "./AuditClsCulpritsViz";

vi.mock("@/features/page-speed-insights/shared/ReportComparisonBarChart", () => ({
  ReportComparisonBarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart">{data.length} rows</div>
  ),
}));

function row(
  items: Array<Record<string, unknown>>,
  opts?: { id?: string; label?: string; listWrap?: boolean },
): DetailTableItem {
  const id = opts?.id ?? "cls-culprits-insight";
  const label = opts?.label ?? "Mobile";
  const details = opts?.listWrap
    ? {
        type: "list" as const,
        items: [{ type: "table", headings: [], items: items as never }],
      } as unknown as DetailTableItem["auditResult"]["details"]
    : { type: "table" as const, headings: [], items: items as never };

  return {
    _userLabel: label,
    auditResult: {
      id,
      details,
    },
  };
}

const shiftWithCauses = {
  score: 0.12,
  node: {
    type: "node",
    nodeLabel: "Hero banner",
    selector: "div.hero > img",
    snippet: '<img src="/hero.jpg">',
  },
  subItems: {
    type: "subitems",
    items: [
      {
        cause: "Unsized image element",
        extra: {
          type: "node",
          nodeLabel: "Hero banner",
          selector: "div.hero > img",
          snippet: '<img src="/hero.jpg">',
        },
      },
      {
        cause: "Web font",
        extra: { type: "url", value: "https://fonts.example.com/inter.woff2" },
      },
      {
        cause: "Injected iframe",
        extra: { type: "url", value: "https://ads.example.com/frame" },
      },
    ],
  },
};

describe("AuditClsCulpritsViz", () => {
  it("renders causes with extras for each shift", () => {
    const { container } = render(
      <AuditClsCulpritsViz
        rows={[
          row([
            { score: 0.15, node: { type: "text", value: "Total" } },
            shiftWithCauses,
          ]),
        ]}
      />,
    );

    expect(container.textContent).toContain("Hero banner");
    expect(container.textContent).toContain("Unsized image element");
    expect(container.textContent).toContain("Web font");
    expect(container.textContent).toContain("Injected iframe");
    expect(container.textContent).toContain("fonts.example.com");
    expect(container.textContent).toContain("ads.example.com");
    expect(container.textContent).toContain("div.hero > img");
    expect(container.textContent).toContain("Root cause mix");
    expect(container.textContent).toContain("Shift culprits");
  });

  it("notes when a shift has no detected cause", () => {
    const { container } = render(
      <AuditClsCulpritsViz
        rows={[
          row([
            {
              score: 0.02,
              node: { type: "node", nodeLabel: "Mystery shift" },
            },
          ]),
        ]}
      />,
    );

    expect(container.textContent).toContain("Mystery shift");
    expect(container.textContent).toContain("No detected root cause for this shift");
  });

  it("returns null when empty", () => {
    const { container } = render(<AuditClsCulpritsViz rows={[row([])]} />);
    expect(container.firstChild).toBeNull();
  });

  it("groups Mobile and Desktop into separate labeled sections", () => {
    const { container } = render(
      <AuditClsCulpritsViz
        rows={[
          row(
            [
              {
                score: 0.08,
                node: { type: "node", nodeLabel: "Mobile hero" },
                subItems: {
                  type: "subitems",
                  items: [{ cause: "Web font", extra: { type: "url", value: "https://fonts.example.com/a.woff2" } }],
                },
              },
            ],
            { label: "Mobile" },
          ),
          row(
            [
              {
                score: 0.04,
                node: { type: "node", nodeLabel: "Desktop hero" },
                subItems: {
                  type: "subitems",
                  items: [{ cause: "Web font", extra: { type: "url", value: "https://fonts.example.com/b.woff2" } }],
                },
              },
            ],
            { label: "Desktop" },
          ),
        ]}
      />,
    );

    const mobileSection = container.querySelector('[aria-label="Mobile layout shift culprits"]');
    const desktopSection = container.querySelector('[aria-label="Desktop layout shift culprits"]');
    expect(mobileSection).not.toBeNull();
    expect(desktopSection).not.toBeNull();
    expect(mobileSection?.textContent).toContain("Mobile hero");
    expect(mobileSection?.textContent).not.toContain("Desktop hero");
    expect(desktopSection?.textContent).toContain("Desktop hero");
    expect(desktopSection?.textContent).not.toContain("Mobile hero");
    expect(container.textContent).toContain("compare reports");
  });
});

