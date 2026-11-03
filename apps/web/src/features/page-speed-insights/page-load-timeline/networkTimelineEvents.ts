import type { CombinedLoad, CombinedRequest } from "./collectTimelineSources";
import { groupDownloads } from "./groupDownloads";
import {
  coverageLabel,
  formatBytes,
  formatMs,
  formatNetworkPriority,
  shortUrl,
} from "@/features/page-speed-insights/shared/format";
import type { TimelineEvent, TimelineNote, TimelineWaterfallBar } from "./types";
import { type PhaseBound, phaseActiveAt } from "./timelinePhases";
import { atIntervalEnd, event } from "./timelineEventFactory";

function queueWindow(
  rendererStart: number | undefined,
  networkStart: number,
): { queueStartMs?: number; queueEndMs?: number } {
  if (rendererStart != null && Number.isFinite(rendererStart) && rendererStart < networkStart) {
    return { queueStartMs: rendererStart, queueEndMs: networkStart };
  }
  return {};
}

export function requestWaterfallBar(
  request: CombinedRequest,
  id: string,
  extras: Partial<TimelineWaterfallBar> = {},
): TimelineWaterfallBar {
  return {
    id,
    label: shortUrl(request.url),
    href: request.url,
    startMs: request.networkRequestTime,
    endMs: request.networkEndTime,
    resourceType: request.resourceType,
    scriptCpu: request.scriptCpu,
    chain: request.chain,
    ...queueWindow(request.rendererStartTime, request.networkRequestTime),
    ...extras,
  };
}

function pluralResourceTitle(resourceType: string, count: number): string {
  const downloaded =
    resourceType === "Script" || resourceType === "Stylesheet" ? " downloaded" : "";
  if (count === 1) return `${resourceType}${downloaded}`;
  if (resourceType === "Script") return `${count} Scripts${downloaded}`;
  if (resourceType === "Stylesheet") return `${count} Stylesheets${downloaded}`;
  if (resourceType === "Font") return `${count} Fonts`;
  if (resourceType === "Image") return `${count} Images`;
  if (resourceType === "Document") return `${count} Documents`;
  if (resourceType === "Fetch") return `${count} Fetches`;
  if (resourceType === "XHR") return `${count} XHRs`;
  return `${count} ${resourceType}s`;
}

function criticalChainFlag(longestChainMs: number | undefined): string {
  if (longestChainMs != null && longestChainMs > 0) {
    return `critical chain (${formatMs(longestChainMs)})`;
  }
  return "critical chain";
}

function isScriptRequest(request: CombinedRequest): boolean {
  if (request.resourceType === "Script") return true;
  return !!request.mimeType?.includes("javascript");
}

/** Lighthouse network-dependency-tree advice, shown on critical-chain scripts. */
function criticalChainScriptNote(): TimelineNote {
  return {
    id: "critical-chain-js",
    title: "Avoid chaining critical requests",
    detail:
      "Reduce the length of chains, reduce the download size of resources, or defer the download of unnecessary resources to improve page load.",
    status: "measured",
    kind: "marker",
  };
}

export function networkEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  const groups = groupDownloads(load.requests);
  const events: TimelineEvent[] = [];

  groups.forEach((group, index) => {
    const startMs = Math.min(...group.map((r) => r.networkRequestTime));
    const endMs = Math.max(...group.map((r) => r.networkEndTime));
    const resourceType = group[0]?.resourceType ?? "Request";
    const anyBlocking = group.some((r) => r.renderBlocking === "blocking");
    const anyDocument = group.some((r) => load.document != null && r.url === load.document.url);
    const anyPreload = group.some((r) => r.isLinkPreload);
    const anyCritical = group.some((r) => r.isCriticalChain);
    const totalBytes = group.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);

    const flags = [
      anyDocument ? "document" : null,
      anyPreload ? "preload" : null,
      anyCritical ? criticalChainFlag(load.longestChainMs) : null,
    ].filter(Boolean);

    const singleCoverage = group.length === 1 ? coverageLabel(group[0]!) : undefined;
    const singlePriority = group.length === 1 ? group[0]!.priority : undefined;

    const detail =
      group.length === 1
        ? [
            shortUrl(group[0]!.url),
            group[0]!.statusCode != null ? `status ${group[0]!.statusCode}` : null,
            group[0]!.transferSize != null ? formatBytes(group[0]!.transferSize) : null,
            group[0]!.protocol ?? null,
            singlePriority ? `priority ${formatNetworkPriority(singlePriority)}` : null,
            flags.length ? flags.join(" · ") : null,
            singleCoverage ?? null,
          ]
            .filter(Boolean)
            .join(" · ") + "."
        : [
            `${group.length} ${resourceType.toLowerCase()} requests`,
            totalBytes > 0 ? formatBytes(totalBytes) : null,
            flags.length ? flags.join(" · ") : null,
          ]
            .filter(Boolean)
            .join(" · ") + ".";

    const groupNotes: TimelineNote[] = [];
    if (anyCritical && group.some(isScriptRequest)) {
      groupNotes.push(criticalChainScriptNote());
    }
    const attachedNotes = groupNotes.length > 0 ? groupNotes : undefined;

    const showPriority = group.some((r) => r.priority);
    const placement = atIntervalEnd(startMs, endMs);
    const phase = phaseActiveAt(bounds, placement.timeMs);

    events.push(
      event(
        {
          id: `net-${index}`,
          title: pluralResourceTitle(resourceType, group.length),
          detail,
          ...placement,
          phaseId: phase.id,
          kind: anyBlocking ? "blocking" : "marker",
          notes: attachedNotes,
          waterfall: group.map((r, i) =>
            requestWaterfallBar(r, `net-${index}-${i}`, {
              coverage: coverageLabel(r),
              priority: r.priority,
              renderBlocking: r.renderBlocking,
            }),
          ),
          table: {
            headers: [
              { text: "URL" },
              { text: "Start", align: "end" },
              { text: "Duration", align: "end" },
              ...(showPriority ? [{ text: "Priority", align: "end" as const }] : []),
            ],
            rows: group.map((r) => [
              { text: shortUrl(r.url), href: r.url },
              { text: formatMs(r.networkRequestTime), align: "end" as const },
              {
                text: formatMs(r.networkEndTime - r.networkRequestTime),
                align: "end" as const,
              },
              ...(showPriority
                ? [
                    {
                      text: r.priority ? formatNetworkPriority(r.priority) : "",
                      align: "end" as const,
                    },
                  ]
                : []),
            ]),
          },
        },
        bounds,
      ),
    );
  });

  return events;
}
