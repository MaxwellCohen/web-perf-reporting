import { getNumber, getUrlString } from "@/lib/utils";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import type { OpportunityItem, TableItem } from "@/lib/schema";

export function numericItemValue(value: unknown): number | undefined {
  const direct = getNumber(value);
  if (direct != null) return direct;
  if (value && typeof value === "object" && "value" in value) {
    return getNumber((value as { value?: unknown }).value);
  }
  return undefined;
}

export function itemLabel(
  item: TableItem | OpportunityItem,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const raw = item[key];
    if (typeof raw === "string" && raw.trim()) {
      return key === "url" || key === "origin" ? shortUrl(raw) : raw;
    }
    if (raw && typeof raw === "object" && "type" in raw) {
      const node = raw as { type?: string; snippet?: string; selector?: string; nodeLabel?: string };
      if (node.type === "node") {
        return node.nodeLabel || node.selector || node.snippet || "Element";
      }
      if (node.type === "source-location") {
        const loc = raw as { url?: string; urlProvider?: string };
        const url = getUrlString(loc.url);
        return url ? shortUrl(url) : "Source";
      }
      if (node.type === "code" && "value" in node) {
        const code = String((node as { value?: unknown }).value ?? "");
        return code.length > 48 ? `${code.slice(0, 45)}…` : code || "Code";
      }
    }
  }
  const url = getUrlString(item.url);
  if (url) return shortUrl(url);
  return "Item";
}

export function itemNumeric(
  item: TableItem | OpportunityItem,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = numericItemValue(item[key]);
    if (value != null && Number.isFinite(value)) return value;
  }
  return undefined;
}
