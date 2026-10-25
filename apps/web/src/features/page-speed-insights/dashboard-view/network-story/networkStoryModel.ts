import type {
  ResourceSummary,
  ResourceSummaryTile,
} from "@/features/page-speed-insights/network-metrics/resourceSummary";

/**
 * Total repeats the sum of the other types. Third-party overlaps them.
 * Both stay off the byte bar so slice shares are portions of the total.
 */
const OVERLAPPING_TYPES = new Set(["total", "third-party"]);

export const NETWORK_FACTS = [
  {
    id: "total",
    label: "Transfer",
    description: "Everything the page transferred over the network, after compression.",
  },
  {
    id: "requests",
    label: "Requests",
    description: "How many times the browser asked the network for a file or response.",
  },
  {
    id: "third-party",
    label: "Third-party",
    description: "The share of those bytes that came from other sites.",
  },
] as const;

export type NetworkFactId = (typeof NETWORK_FACTS)[number]["id"];

export type NetworkSlice = {
  resourceType: string;
  label: string;
  transferSize: number;
  requestCount: number;
  /** Fraction of the total transfer. Null when this report has no positive total. */
  share: number | null;
};

export type DeviceNetwork = {
  label: string;
  totalBytes: number | null;
  requestCount: number | null;
  thirdPartyBytes: number | null;
  /** thirdPartyBytes / totalBytes when the total is positive. */
  thirdPartyShare: number | null;
  slices: NetworkSlice[];
};

export type NetworkStory = {
  key: string;
  devices: DeviceNetwork[];
  facts: NetworkFactId[];
};

function recorded(tile: ResourceSummaryTile | undefined): ResourceSummaryTile | null {
  if (!tile) return null;
  if (tile.requestCount === 0 && tile.transferSize === 0) return null;
  return tile;
}

function shareOf(part: number, totalBytes: number | null): number | null {
  if (totalBytes == null || totalBytes <= 0) return null;
  return part / totalBytes;
}

function toDevice(summary: ResourceSummary): DeviceNetwork | null {
  const total = recorded(summary.tiles.find((tile) => tile.resourceType === "total"));
  const thirdParty = recorded(
    summary.tiles.find((tile) => tile.resourceType === "third-party"),
  );
  const totalBytes = total ? total.transferSize : null;
  const slices = summary.tiles.flatMap((tile) => {
    if (OVERLAPPING_TYPES.has(tile.resourceType) || !recorded(tile)) return [];
    return [
      {
        resourceType: tile.resourceType,
        label: tile.label,
        transferSize: tile.transferSize,
        requestCount: tile.requestCount,
        share: shareOf(tile.transferSize, totalBytes),
      },
    ];
  });

  const thirdPartyBytes = thirdParty ? thirdParty.transferSize : null;
  const device: DeviceNetwork = {
    label: summary.label,
    totalBytes,
    requestCount: total ? total.requestCount : null,
    thirdPartyBytes,
    thirdPartyShare: thirdPartyBytes == null ? null : shareOf(thirdPartyBytes, totalBytes),
    slices,
  };

  const empty =
    device.totalBytes == null &&
    device.requestCount == null &&
    device.thirdPartyBytes == null &&
    device.slices.length === 0;
  return empty ? null : device;
}

function factsFor(devices: DeviceNetwork[]): NetworkFactId[] {
  const facts: NetworkFactId[] = [];
  if (devices.some((device) => device.totalBytes != null)) facts.push("total");
  if (devices.some((device) => device.requestCount != null)) facts.push("requests");
  if (devices.some((device) => device.thirdPartyBytes != null)) facts.push("third-party");
  return facts;
}

function storyKey(devices: DeviceNetwork[]): string {
  return devices
    .map((device) => {
      const slices = device.slices
        .map((slice) => `${slice.resourceType}:${slice.transferSize}:${slice.requestCount}`)
        .join(",");
      return [
        device.label,
        device.totalBytes ?? "",
        device.requestCount ?? "",
        device.thirdPartyBytes ?? "",
        slices,
      ].join(":");
    })
    .join("|");
}

export function networkStoryFromSummaries(summaries: ResourceSummary[]): NetworkStory | null {
  const devices = summaries.flatMap((summary) => {
    const device = toDevice(summary);
    return device ? [device] : [];
  });
  if (!devices.length) return null;

  return {
    key: storyKey(devices),
    devices,
    facts: factsFor(devices),
  };
}
