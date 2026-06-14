import { rowsToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/rowsToMarkdown";

/**
 * Serializes a CSS-grid table layout (row divs with cell children) as Markdown.
 */
export function gridContainerToMarkdown(container: HTMLElement): string {
  const rows = Array.from(container.children).map((row) =>
    Array.from(row.children).map((cell) => cell.textContent?.trim() ?? ""),
  );

  return rowsToMarkdown(rows);
}
