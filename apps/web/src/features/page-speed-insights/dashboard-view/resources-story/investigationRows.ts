import { getTreemapLabel } from "@/features/page-speed-insights/script-treemap/treemapChartData";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { KNOWN_TYPES, SUSPECT_LIMIT, UNUSED_SHARE, URLS_PER_TYPE } from "./investigationThresholds";
import type {
  ActionHint,
  MergedRow,
  ResourceSuspect,
  ResourcesInvestigationInput,
  WeightNode,
} from "./investigationTypes";

export function positive(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function percentText(share: number): string {
  const percent = Math.round(Math.min(1, Math.max(0, share)) * 100);
  if (percent <= 0 && share > 0) return "<1%";
  return `${percent}%`;
}

function canonicalType(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Other";
  return KNOWN_TYPES.find((type) => type.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

function unusedShare(unusedBytes: number, transferSize: number): number | null {
  if (unusedBytes <= 0) return null;
  if (transferSize <= 0) return 1;
  return Math.min(1, unusedBytes / transferSize);
}

export function shortLabel(url: string): string {
  return getTreemapLabel(url, 42) || url;
}

function actionHint(row: MergedRow): ActionHint {
  const share =
    row.transferSize > 0 ? row.unusedBytes / row.transferSize : row.unusedBytes > 0 ? 1 : 0;
  if (row.unusedBytes >= 10_000 && share >= UNUSED_SHARE) return "remove-unused";
  if (row.bootupMs >= 500) return "split";
  if (row.bootupMs >= 200) return "defer";
  if (row.thirdParty) return "third-party-audit";
  return "cut-weight";
}

function whyText(row: MergedRow): string {
  const parts: string[] = [];
  if (row.transferSize > 0) parts.push(`${formatBytes(row.transferSize)} transferred`);
  if (row.unusedBytes > 0) parts.push(`${formatBytes(row.unusedBytes)} unused`);
  if (row.bootupMs > 0) parts.push(`${formatMs(row.bootupMs)} to parse and run`);
  if (row.thirdParty) parts.push(row.entity ? `third-party · ${row.entity}` : "third-party");
  return parts.join(" · ");
}

export function mergeRows(input: ResourcesInvestigationInput): MergedRow[] {
  const rows = new Map<string, MergedRow>();

  function slot(url: string): MergedRow {
    const existing = rows.get(url);
    if (existing) return existing;
    const created: MergedRow = {
      url,
      resourceType: "Other",
      transferSize: 0,
      unusedBytes: 0,
      bootupMs: 0,
      thirdParty: false,
    };
    rows.set(url, created);
    return created;
  }

  for (const request of input.requests) {
    if (!request.url || request.transferSize <= 0) continue;
    const current = slot(request.url);
    current.transferSize += request.transferSize;
    current.resourceType = canonicalType(request.resourceType || current.resourceType);
    current.thirdParty = current.thirdParty || Boolean(request.thirdParty);
    if (request.entity) current.entity = request.entity;
  }

  for (const script of input.scripts) {
    if (!script.url) continue;
    if (script.transferSize <= 0 && script.unusedBytes <= 0 && script.bootupMs <= 0) continue;
    const current = slot(script.url);
    if (current.resourceType === "Other") current.resourceType = "Script";
    current.unusedBytes += Math.max(0, script.unusedBytes);
    current.bootupMs += Math.max(0, script.bootupMs);
    if (current.transferSize <= 0) current.transferSize = Math.max(0, script.transferSize);
  }

  return [...rows.values()];
}

export function weightNodes(rows: MergedRow[]): WeightNode[] {
  const byType = new Map<string, MergedRow[]>();
  for (const row of rows) {
    if (row.transferSize <= 0) continue;
    const group = byType.get(row.resourceType) ?? [];
    group.push(row);
    byType.set(row.resourceType, group);
  }

  const types = [...byType.entries()].sort(
    (left, right) =>
      right[1].reduce((sum, row) => sum + row.transferSize, 0) -
      left[1].reduce((sum, row) => sum + row.transferSize, 0),
  );

  const nodes: WeightNode[] = [];
  for (const [resourceType, group] of types) {
    const sorted = [...group].sort((left, right) => right.transferSize - left.transferSize);
    const visible = sorted.slice(0, URLS_PER_TYPE);
    const rest = sorted.slice(URLS_PER_TYPE);
    for (const row of visible) {
      nodes.push({
        id: row.url,
        url: row.url,
        label: shortLabel(row.url),
        resourceType,
        transferSize: row.transferSize,
        unusedBytes: row.unusedBytes,
        unusedShare: unusedShare(row.unusedBytes, row.transferSize),
        aggregate: false,
      });
    }
    if (rest.length) {
      const transferSize = rest.reduce((sum, row) => sum + row.transferSize, 0);
      const unusedBytes = rest.reduce((sum, row) => sum + row.unusedBytes, 0);
      nodes.push({
        id: `rest:${resourceType}`,
        url: "",
        label: `${rest.length} smaller ${rest.length === 1 ? "file" : "files"}`,
        resourceType,
        transferSize,
        unusedBytes,
        unusedShare: unusedShare(unusedBytes, transferSize),
        aggregate: true,
      });
    }
  }
  return nodes;
}

export function suspectsFrom(rows: MergedRow[]): ResourceSuspect[] {
  const useful = rows.filter(
    (row) => row.transferSize > 0 || row.unusedBytes > 0 || row.bootupMs > 0,
  );
  const maxTransfer = Math.max(0, ...useful.map((row) => row.transferSize));
  const maxUnused = Math.max(0, ...useful.map((row) => row.unusedBytes));
  const maxBoot = Math.max(0, ...useful.map((row) => row.bootupMs));

  return useful
    .map((row) => {
      const transfer = maxTransfer > 0 ? row.transferSize / maxTransfer : 0;
      const unused = maxUnused > 0 ? row.unusedBytes / maxUnused : 0;
      const boot = maxBoot > 0 ? row.bootupMs / maxBoot : 0;
      const score = transfer + unused * 1.6 + boot * 1.3 + (row.thirdParty ? 0.15 : 0);
      return { row, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.row.transferSize - left.row.transferSize ||
        left.row.url.localeCompare(right.row.url),
    )
    .slice(0, SUSPECT_LIMIT)
    .map(({ row }) => ({
      url: row.url,
      label: shortLabel(row.url),
      resourceType: row.resourceType,
      transferSize: row.transferSize,
      unusedBytes: row.unusedBytes,
      unusedShare: unusedShare(row.unusedBytes, row.transferSize),
      bootupMs: row.bootupMs,
      thirdParty: row.thirdParty,
      ...(row.entity ? { entity: row.entity } : {}),
      actionHint: actionHint(row),
      why: whyText(row),
    }));
}
