import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenderNetworkDependencyTree } from "@/features/page-speed-insights/lh-categories/table/RenderNetworkDependencyTree";

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: vi.fn(() => []),
}));

vi.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Details: ({ children }: { children: React.ReactNode }) => <details>{children}</details>,
}));

vi.mock("@/components/ui/tree-view", () => ({
  TreeView: ({ data }: { data: { id: string; name: string }[] }) => (
    <div data-testid="tree-view">
      {data.map((d) => (
        <div key={d.id}>{d.name}</div>
      ))}
    </div>
  ),
}));

describe("RenderNetworkDependencyTree", () => {
  it("returns null when no network trees in items", () => {
    const { container } = render(<RenderNetworkDependencyTree />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when items contain network-dependency-tree-insight audit", async () => {
    const { usePageSpeedItems } = await import("@/features/page-speed-insights/PageSpeedContext");
    vi.mocked(usePageSpeedItems).mockReturnValue([
      {
        item: {
          lighthouseResult: {
            audits: {
              "network-dependency-tree-insight": {
                details: {
                  type: "list",
                  items: [
                    {
                      value: {
                        type: "network-tree",
                        longestChain: { duration: 100 },
                        chains: {
                          "0": {
                            url: "https://example.com",
                            transferSize: 1000,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        label: "Desktop",
      },
    ] as any);

    const { container } = render(<RenderNetworkDependencyTree />);
    expect(container.querySelector('[data-testid="accordion-item"]')).toBeTruthy();
    expect(container.textContent).toContain("Network Dependency Tree");
  });
});
