import { escapeCsvCell } from "@/features/page-speed-insights/tanstack-table-v9/csvCell";

/**
 * Serializes a CSS-grid table layout (row divs with cell children) as CSV.
 */
export function gridContainerToCsv(container: HTMLElement): string {
  return Array.from(container.children)
    .map((row) =>
      Array.from(row.children)
        .map((cell) => escapeCsvCell(cell.textContent?.trim() ?? ""))
        .join(","),
    )
    .join("\n");
}
