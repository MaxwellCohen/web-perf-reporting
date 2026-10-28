import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { OpportunityItem, TableItem } from "@/lib/schema";

export type AnyItem = TableItem | OpportunityItem;
export type ReportItems = { label: string; items: AnyItem[] };

export function reportsOf(rows: DetailTableItem[]): ReportItems[] {
  return rows.map((row, index) => ({
    label: row._userLabel || `Report ${index + 1}`,
    items: (row.auditResult?.details?.items || []) as AnyItem[],
  }));
}

export function hasAnyItems(reports: ReportItems[]): boolean {
  return reports.some((report) => report.items.length > 0);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

/** Reads a plain string from a string or `{ value | text | snippet }` wrapper. */
export function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["value", "text", "snippet", "url"]) {
      if (typeof obj[key] === "string") return (obj[key] as string).trim();
    }
  }
  return "";
}

export function urlOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") {
    return (value as { url: string }).url;
  }
  return "";
}

export function subItemsOf(item: AnyItem): Array<Record<string, unknown>> {
  return ((item.subItems as { items?: unknown[] } | undefined)?.items ||
    []) as Array<Record<string, unknown>>;
}

export type Group<T> = { key: string; count: number; labels: string[]; data: T };

/** Groups items across reports by key, tracking occurrence count and report labels. */
export function groupAcross<T>(
  reports: ReportItems[],
  keyOf: (item: AnyItem) => string | undefined,
  init: () => T,
  fold?: (data: T, item: AnyItem) => void,
): Array<Group<T>> {
  const map = new Map<string, Group<T>>();
  for (const report of reports) {
    for (const item of report.items) {
      const key = keyOf(item);
      if (!key) continue;
      let group = map.get(key);
      if (!group) {
        group = { key, count: 0, labels: [], data: init() };
        map.set(key, group);
      }
      group.count += 1;
      if (!group.labels.includes(report.label)) group.labels.push(report.label);
      fold?.(group.data, item);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function Attribution({ labels, multi }: { labels: string[]; multi: boolean }) {
  if (!multi) return null;
  return <span className="text-xs text-muted-foreground"> · {labels.join(", ")}</span>;
}

export function Chip({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={
        tone === "warn"
          ? "rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs text-amber-700 dark:text-amber-300"
          : "rounded border bg-muted/30 px-1.5 py-0.5 font-mono text-xs"
      }
    >
      {children}
    </span>
  );
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
