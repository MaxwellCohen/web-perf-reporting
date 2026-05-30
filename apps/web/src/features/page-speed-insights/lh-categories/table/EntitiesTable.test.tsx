import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EntitiesTable } from "@/features/page-speed-insights/lh-categories/table/EntitiesTable";

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: vi.fn(() => []),
}));

vi.mock("@/features/page-speed-insights/shared/TableCard", () => ({
  TableCard: ({ title, table }: { title: string; table: unknown }) => (
    <div data-testid="table-card">
      <span data-testid="card-title">{title}</span>
    </div>
  ),
}));

vi.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("EntitiesTable", () => {
  it("returns null when no valid items with entities", () => {
    const { container } = render(<EntitiesTable />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when items have entities", async () => {
    const { usePageSpeedItems } = await import("@/features/page-speed-insights/PageSpeedContext");
    vi.mocked(usePageSpeedItems).mockReturnValue([
      {
        item: {
          lighthouseResult: {
            entities: [
              {
                name: "Entity A",
                isFirstParty: false,
                isUnrecognized: false,
                origins: ["https://a.com"],
              },
            ],
          },
        },
        label: "Desktop",
      },
    ] as any);

    const { container } = render(<EntitiesTable />);
    expect(container.querySelector('[data-testid="accordion-item"]')).toBeTruthy();
    expect(container.textContent).toContain("Entities");
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
  });
});
