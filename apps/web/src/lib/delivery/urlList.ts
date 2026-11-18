import type { DeliveryReport } from "@maxwellcohen/delivery-core";
import { isGhost } from "@maxwellcohen/delivery-core/render";

export const MAX_BULK_URLS = 50;

/** Split pasted text (newlines, commas, spaces) into unique URLs; `#` starts a comment line. */
export function parseUrlList(
  text: string,
  max = MAX_BULK_URLS,
): { urls: string[]; dropped: number } {
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    for (const token of line.split(/[\s,]+/)) if (token) seen.add(token);
  }
  const all = [...seen];
  return { urls: all.slice(0, max), dropped: Math.max(0, all.length - max) };
}

export type BulkRow = {
  url: string;
  state: "queued" | "running" | "done" | "error";
  report?: DeliveryReport;
  error?: string;
};

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV row per URL: summary plus the worst resource. */
export function bulkCsv(rows: BulkRow[]): string {
  const head = [
    "url",
    "state",
    "status",
    "ghosts",
    "checked",
    "ghost_resources",
    "not_checked",
    "error",
  ];
  const lines = rows.map((r) => {
    const rep = r.report;
    const all = rep ? [rep.document, ...rep.assets] : [];
    const ghosts = all.filter(isGhost);
    return [
      r.url,
      r.state,
      rep?.document.status ?? "",
      rep?.ghosts ?? "",
      rep ? all.length : "",
      ghosts
        .map((g) => `${g.url} (${g.receivedBytes}/${g.declaredBytes ?? "?"} ${g.end.kind})`)
        .join(" | "),
      rep?.notChecked.length ?? "",
      r.error ?? "",
    ]
      .map(cell)
      .join(",");
  });
  return [head.join(","), ...lines].join("\n") + "\n";
}
