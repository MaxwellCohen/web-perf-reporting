import { rowsToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/rowsToMarkdown";

export function htmlTableToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) => cell.innerText.trim()),
  );

  return rowsToMarkdown(rows);
}
