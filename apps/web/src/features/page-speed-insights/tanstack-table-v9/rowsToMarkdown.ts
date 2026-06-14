import { escapeMarkdownCell } from "@/features/page-speed-insights/tanstack-table-v9/markdownCell";

export function rowsToMarkdown(rows: string[][]): string {
  if (rows.length === 0) {
    return "";
  }

  const [header, ...dataRows] = rows;
  const headerLine = `| ${header.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${header.map(() => "---").join(" | ")} |`;
  const dataLines = dataRows.map(
    (row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`,
  );

  return [headerLine, separator, ...dataLines].join("\n");
}
