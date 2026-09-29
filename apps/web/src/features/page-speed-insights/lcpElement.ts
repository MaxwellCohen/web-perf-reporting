import type { NodeValue } from "@/lib/schema";
import type { MetricAuditSource } from "@/features/page-speed-insights/metricCauseAudits";

export type LcpElement = {
  label: string;
  node: NodeValue;
};

function isLcpNode(value: unknown): value is NodeValue {
  if (!value || typeof value !== "object") return false;
  return (value as { type?: unknown }).type === "node";
}

/**
 * Lighthouse stores the LCP element as a node item on `lcp-breakdown-insight`,
 * after the subpart timing table.
 */
export function collectLcpElements(sources: MetricAuditSource[]): LcpElement[] {
  const elements: LcpElement[] = [];

  for (const { audits, label } of sources) {
    const details = audits["lcp-breakdown-insight"]?.details;
    const items = details && "items" in details ? details.items : undefined;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (isLcpNode(item)) {
        elements.push({ label, node: item });
      }
    }
  }

  return elements;
}
