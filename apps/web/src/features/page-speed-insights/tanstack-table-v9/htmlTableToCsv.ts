import { escapeCsvCell } from "@/features/page-speed-insights/tanstack-table-v9/csvCell";

export function htmlTableToCsv(table: HTMLTableElement): string {
  return Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => escapeCsvCell(cell.innerText.trim()))
        .join(","),
    )
    .join("\n");
}
