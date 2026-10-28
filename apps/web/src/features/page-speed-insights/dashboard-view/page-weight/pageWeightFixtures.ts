import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

export const KB = 1024;

type Request = { url: string; resourceType: string; transferSize: number };

export function weightReport(
  label: string,
  requests: Request[],
  summary?: Array<{ resourceType: string; requestCount: number; transferSize: number }>,
): InsightsContextItem {
  return {
    label,
    item: {
      lighthouseResult: {
        audits: {
          ...(summary
            ? {
                "resource-summary": {
                  details: { type: "table", headings: [], items: summary },
                },
              }
            : {}),
          "network-requests": {
            details: { type: "table", headings: [], items: requests },
          },
        },
      },
    },
  } as unknown as InsightsContextItem;
}
