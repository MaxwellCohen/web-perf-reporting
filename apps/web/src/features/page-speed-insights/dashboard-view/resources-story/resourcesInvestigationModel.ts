import type { ResourceStageId } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { javascriptStoryFromMetrics } from "@/features/page-speed-insights/dashboard-view/javascript-story/javascriptStoryModel";
import { networkStoryFromSummaries } from "@/features/page-speed-insights/dashboard-view/network-story/networkStoryModel";
import type { JSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import { selectJavaScriptMetrics } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";
import { collectResourceSummaries } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import { getTreemapLabel } from "@/features/page-speed-insights/script-treemap/treemapChartData";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";

const UNUSED_SHARE = 0.25;
const UNUSED_BYTES = 20_000;
const SCRIPT_SHARE = 0.45;
const SCRIPT_BYTES = 50_000;
const THIRD_PARTY_SHARE = 0.4;
const THIRD_PARTY_BYTES = 50_000;
const LONG_TASK_MS = 400;
const MAIN_THREAD_MS = 2_000;
const LONG_TASK_LOAD_SHARE = 0.2;
const LONG_TASK_LOAD_FLOOR_MS = 250;
const SUSPECT_LIMIT = 8;
const URLS_PER_TYPE = 6;
const KNOWN_TYPES = [
  "Document",
  "Script",
  "Stylesheet",
  "Font",
  "Image",
  "Media",
  "XHR",
  "Fetch",
  "Other",
];

type LeadKind =
  | "wasted-download"
  | "script-weight"
  | "third-party"
  | "main-thread"
  | "heaviest-urls";

export type ActionHint = "remove-unused" | "cut-weight" | "defer" | "split" | "third-party-audit";

type InvestigationRequest = {
  url: string;
  resourceType: string;
  transferSize: number;
  thirdParty?: boolean;
  entity?: string;
};

type InvestigationScript = {
  url: string;
  transferSize: number;
  unusedBytes: number;
  bootupMs: number;
};

export type ResourcesInvestigationInput = {
  label: string;
  totalBytes: number | null;
  requestCount: number | null;
  thirdPartyBytes: number | null;
  scriptBytes: number | null;
  unusedBytes: number | null;
  mainThreadMs: number | null;
  longTaskMs: number | null;
  loadTimeMs: number | null;
  requests: InvestigationRequest[];
  scripts: InvestigationScript[];
};

type InvestigationLead = {
  kind: LeadKind;
  magnitude: string;
  sentence: string;
  stage: ResourceStageId;
};

export type FlowStage = {
  id: ResourceStageId;
  label: string;
  caption: string;
  /** 0–1 width of this row. */
  bar: number;
};

export type WeightNode = {
  id: string;
  url: string;
  label: string;
  resourceType: string;
  transferSize: number;
  unusedBytes: number;
  unusedShare: number | null;
  aggregate: boolean;
};

export type ResourceSuspect = {
  url: string;
  label: string;
  resourceType: string;
  transferSize: number;
  unusedBytes: number;
  unusedShare: number | null;
  bootupMs: number;
  thirdParty: boolean;
  entity?: string;
  actionHint: ActionHint;
  why: string;
};

export type InvestigationMetrics = {
  transferBytes: number | null;
  scriptBytes: number | null;
  unusedBytes: number | null;
  thirdPartyBytes: number | null;
  mainThreadMs: number | null;
  longTaskMs: number | null;
};

export type ResourcesInvestigation = {
  key: string;
  label: string;
  lead: InvestigationLead;
  stages: FlowStage[];
  nodes: WeightNode[];
  suspects: ResourceSuspect[];
  requestCount: number | null;
  thirdPartyBytes: number | null;
  metrics: InvestigationMetrics;
};

type MergedRow = {
  url: string;
  resourceType: string;
  transferSize: number;
  unusedBytes: number;
  bootupMs: number;
  thirdParty: boolean;
  entity?: string;
};

const LEAD_STAGE: Record<LeadKind, ResourceStageId> = {
  "wasted-download": "unused",
  "script-weight": "scripts",
  "third-party": "arrived",
  "main-thread": "main-thread",
  "heaviest-urls": "arrived",
};

function positive(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function percentText(share: number): string {
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

function shortLabel(url: string): string {
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

function mergeRows(input: ResourcesInvestigationInput): MergedRow[] {
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

function weightNodes(rows: MergedRow[]): WeightNode[] {
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

function suspectsFrom(rows: MergedRow[]): ResourceSuspect[] {
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

function mainThreadIsLarge(
  mainThreadMs: number | null,
  longTaskMs: number | null,
  loadTimeMs: number | null,
): boolean {
  if (longTaskMs != null && longTaskMs >= LONG_TASK_MS) return true;
  if (mainThreadMs != null && mainThreadMs >= MAIN_THREAD_MS) return true;
  if (
    loadTimeMs != null &&
    loadTimeMs > 0 &&
    longTaskMs != null &&
    longTaskMs >= LONG_TASK_LOAD_FLOOR_MS &&
    longTaskMs / loadTimeMs >= LONG_TASK_LOAD_SHARE
  ) {
    return true;
  }
  return false;
}

function topEntity(rows: MergedRow[]): string | undefined {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.thirdParty || !row.entity || row.transferSize <= 0) continue;
    totals.set(row.entity, (totals.get(row.entity) ?? 0) + row.transferSize);
  }
  return [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function leadFor(args: {
  transfer: number | null;
  script: number | null;
  unused: number | null;
  thirdParty: number | null;
  mainThreadMs: number | null;
  longTaskMs: number | null;
  loadTimeMs: number | null;
  rows: MergedRow[];
}): InvestigationLead | null {
  const { transfer, script, unused, thirdParty, mainThreadMs, longTaskMs, loadTimeMs, rows } = args;
  const heaviest = [...rows].sort((left, right) => right.transferSize - left.transferSize)[0];
  const scriptShare = script != null && transfer != null ? script / transfer : 0;
  const unusedRatio = unused != null && script != null ? unused / script : 0;
  const thirdShare = thirdParty != null && transfer != null ? thirdParty / transfer : 0;

  let kind: LeadKind | null = null;
  if (unused != null && script != null && unusedRatio >= UNUSED_SHARE && unused >= UNUSED_BYTES) {
    kind = "wasted-download";
  } else if (
    script != null &&
    transfer != null &&
    scriptShare >= SCRIPT_SHARE &&
    script >= SCRIPT_BYTES
  ) {
    kind = "script-weight";
  } else if (
    thirdParty != null &&
    transfer != null &&
    thirdShare >= THIRD_PARTY_SHARE &&
    thirdParty >= THIRD_PARTY_BYTES
  ) {
    kind = "third-party";
  } else if (mainThreadIsLarge(mainThreadMs, longTaskMs, loadTimeMs)) {
    kind = "main-thread";
  } else if (heaviest && heaviest.transferSize > 0) {
    kind = "heaviest-urls";
  } else if (transfer != null) {
    kind = "heaviest-urls";
  } else if (mainThreadMs != null || longTaskMs != null) {
    kind = "main-thread";
  } else if (script != null) {
    kind = "script-weight";
  }

  if (!kind) return null;

  if (kind === "wasted-download" && unused != null && script != null) {
    const pct = percentText(unused / script);
    return {
      kind,
      magnitude: pct,
      sentence: `${pct} of downloaded JavaScript never ran on this load (${formatBytes(unused)} unused).`,
      stage: LEAD_STAGE[kind],
    };
  }

  if (kind === "script-weight" && script != null) {
    const pct = transfer != null ? percentText(script / transfer) : formatBytes(script);
    return {
      kind,
      magnitude: pct,
      sentence:
        transfer != null
          ? `Scripts are ${pct} of everything transferred (${formatBytes(script)}).`
          : `Scripts account for ${formatBytes(script)} of this download.`,
      stage: LEAD_STAGE[kind],
    };
  }

  if (kind === "third-party" && thirdParty != null) {
    const pct = transfer != null ? percentText(thirdParty / transfer) : formatBytes(thirdParty);
    const entity = topEntity(rows);
    const source = entity ? ` ${entity} is the heaviest outside source.` : "";
    return {
      kind,
      magnitude: pct,
      sentence:
        transfer != null
          ? `Third-party responses are ${pct} of the transfer.${source}`
          : `Third-party responses account for ${formatBytes(thirdParty)}.${source}`,
      stage: LEAD_STAGE[kind],
    };
  }

  if (kind === "main-thread") {
    const magnitude = formatMs(longTaskMs ?? mainThreadMs ?? 0);
    let sentence = "Main-thread work is the cost to investigate.";
    if (mainThreadMs != null && longTaskMs != null) {
      sentence = `The main thread spent ${formatMs(mainThreadMs)} here, including ${formatMs(longTaskMs)} of long tasks.`;
    } else if (longTaskMs != null) {
      sentence = `Long tasks consumed ${formatMs(longTaskMs)} of the main thread.`;
    } else if (mainThreadMs != null) {
      sentence = `The main thread spent ${formatMs(mainThreadMs)} on scripting, style, layout, and paint.`;
    }
    return { kind, magnitude, sentence, stage: LEAD_STAGE[kind] };
  }

  if (heaviest && heaviest.transferSize > 0) {
    return {
      kind: "heaviest-urls",
      magnitude: formatBytes(heaviest.transferSize),
      sentence: `${shortLabel(heaviest.url)} is the heaviest download. Start by asking whether the page needs it.`,
      stage: "arrived",
    };
  }

  return {
    kind: "heaviest-urls",
    magnitude: formatBytes(transfer ?? 0),
    sentence: "The page transferred this much, but no single URL stood out.",
    stage: "arrived",
  };
}

function stagesFor(args: {
  transfer: number | null;
  script: number | null;
  unused: number | null;
  requestCount: number | null;
  mainThreadMs: number | null;
  longTaskMs: number | null;
  loadTimeMs: number | null;
}): FlowStage[] {
  const { transfer, script, unused, requestCount, mainThreadMs, longTaskMs, loadTimeMs } = args;
  const stages: FlowStage[] = [];
  if (transfer != null) {
    const requests =
      requestCount != null
        ? ` · ${requestCount.toLocaleString()} ${requestCount === 1 ? "request" : "requests"}`
        : "";
    stages.push({
      id: "arrived",
      label: "Arrived",
      caption: `${formatBytes(transfer)}${requests}`,
      bar: 1,
    });
  }
  if (script != null) {
    const share = transfer != null ? Math.min(1, script / transfer) : 1;
    stages.push({
      id: "scripts",
      label: "Scripts",
      caption:
        transfer != null
          ? `${formatBytes(script)} · ${percentText(share)} of the transfer`
          : formatBytes(script),
      bar: Math.max(share, 0.08),
    });
  }
  if (unused != null) {
    const share =
      transfer != null
        ? Math.min(1, unused / transfer)
        : script != null
          ? Math.min(1, unused / script)
          : 1;
    const ofScripts = script != null ? ` · ${percentText(unused / script)} of scripts` : "";
    stages.push({
      id: "unused",
      label: "Unused",
      caption: `${formatBytes(unused)}${ofScripts}`,
      bar: Math.max(share, 0.08),
    });
  }
  const thread = mainThreadMs ?? longTaskMs;
  if (thread != null) {
    const cost = longTaskMs ?? mainThreadMs ?? thread;
    const bar =
      loadTimeMs != null && loadTimeMs > 0 ? Math.min(1, Math.max(0.08, cost / loadTimeMs)) : 1;
    const longNote =
      longTaskMs != null && mainThreadMs != null ? ` · ${formatMs(longTaskMs)} long tasks` : "";
    stages.push({
      id: "main-thread",
      label: "Main thread",
      caption: `${formatMs(thread)}${longNote}`,
      bar,
    });
  }
  return stages;
}

export function buildResourcesInvestigation(
  input: ResourcesInvestigationInput,
): ResourcesInvestigation | null {
  const rows = mergeRows(input);
  const requestBytes = rows.reduce((sum, row) => sum + row.transferSize, 0);
  const scriptFromRows = rows
    .filter((row) => row.resourceType === "Script")
    .reduce((sum, row) => sum + row.transferSize, 0);
  const unusedFromRows = rows.reduce((sum, row) => sum + row.unusedBytes, 0);
  const transfer = positive(input.totalBytes) ?? positive(requestBytes);
  const script = positive(input.scriptBytes) ?? positive(scriptFromRows);
  const unused = positive(input.unusedBytes) ?? positive(unusedFromRows);
  const thirdParty = positive(input.thirdPartyBytes);
  const mainThreadMs = positive(input.mainThreadMs);
  const longTaskMs = positive(input.longTaskMs);
  const loadTimeMs = positive(input.loadTimeMs);
  const requestCount =
    input.requestCount ??
    (input.requests.filter((request) => request.transferSize > 0).length || null);

  const lead = leadFor({
    transfer,
    script,
    unused,
    thirdParty,
    mainThreadMs,
    longTaskMs,
    loadTimeMs,
    rows,
  });
  if (!lead) return null;

  const stages = stagesFor({
    transfer,
    script,
    unused,
    requestCount,
    mainThreadMs,
    longTaskMs,
    loadTimeMs,
  });
  const suspects = suspectsFrom(rows);
  const nodes = weightNodes(rows);

  return {
    key: [
      input.label,
      lead.kind,
      Math.round(transfer ?? 0),
      suspects.map((suspect) => suspect.url).join(","),
    ].join(":"),
    label: input.label,
    lead,
    stages,
    nodes,
    suspects,
    requestCount,
    thirdPartyBytes: thirdParty,
    metrics: {
      transferBytes: transfer,
      scriptBytes: script,
      unusedBytes: unused,
      thirdPartyBytes: thirdParty,
      mainThreadMs,
      longTaskMs,
    },
  };
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function scriptsFrom(metric: JSMetrics): InvestigationScript[] {
  const byUrl = new Map<string, InvestigationScript>();
  function slot(url: string): InvestigationScript {
    const existing = byUrl.get(url);
    if (existing) return existing;
    const created = { url, transferSize: 0, unusedBytes: 0, bootupMs: 0 };
    byUrl.set(url, created);
    return created;
  }

  for (const resource of metric.jsResources) {
    const url = getUrlString(resource.url);
    if (!url) continue;
    slot(url).transferSize += finite(getNumber(resource.transferSize));
  }
  for (const item of metric.unusedJS) {
    const url = getUrlString(item.url);
    if (!url) continue;
    const wasted = getNumber(item.wastedBytes);
    const unused = getNumber(item.unusedBytes);
    slot(url).unusedBytes += wasted ?? unused ?? 0;
  }
  for (const item of metric.bootupTime) {
    const url = getUrlString(item.url);
    if (!url) continue;
    const parse = finite(getNumber(item.scriptParseCompile));
    const scripting = finite(getNumber(item.scripting));
    slot(url).bootupMs += getNumber(item.total) ?? parse + scripting;
  }
  return [...byUrl.values()];
}

function networkRequestItems(entry: InsightsContextItem): TableItem[] {
  const details = entry.item.lighthouseResult?.audits?.["network-requests"]?.details;
  if (!details || !("items" in details) || !Array.isArray(details.items)) return [];
  return details.items;
}

function partyNames(entry: InsightsContextItem): { first: Set<string>; third: Set<string> } {
  const first = new Set<string>();
  const third = new Set<string>();
  for (const entity of entry.item.lighthouseResult?.entities ?? []) {
    if (!entity?.name) continue;
    if (entity.isFirstParty) first.add(entity.name);
    else third.add(entity.name);
  }
  return { first, third };
}

function loadTimeFrom(entry: InsightsContextItem): number | null {
  const audit = entry.item.lighthouseResult?.audits?.metrics as
    | { details?: { items?: Array<Record<string, unknown>> } }
    | undefined;
  const value = audit?.details?.items?.[0]?.observedLoad;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function inputFromEntry(entry: InsightsContextItem): ResourcesInvestigationInput {
  const summary = collectResourceSummaries([entry])[0];
  const device = summary ? networkStoryFromSummaries([summary])?.devices[0] : undefined;
  const { jsMetrics, jsStats } = selectJavaScriptMetrics({ context: { items: [entry] } });
  const jsReport = javascriptStoryFromMetrics({ jsMetrics, jsStats })?.reports[0];
  const metric = jsMetrics[0];
  const parties = partyNames(entry);

  const requests = networkRequestItems(entry).flatMap((item) => {
    const url = getUrlString(item.url);
    const transferSize = finite(getNumber(item.transferSize));
    if (!url || transferSize <= 0) return [];
    const entity = typeof item.entity === "string" ? item.entity : undefined;
    const resourceType = typeof item.resourceType === "string" ? item.resourceType : "Other";
    return [
      {
        url,
        resourceType,
        transferSize,
        thirdParty: entity ? parties.third.has(entity) : false,
        ...(entity ? { entity } : {}),
      },
    ];
  });

  return {
    label: entry.label,
    totalBytes: device?.totalBytes ?? null,
    requestCount: device?.requestCount ?? null,
    thirdPartyBytes: device?.thirdPartyBytes ?? null,
    scriptBytes: jsReport?.values.transfer ?? null,
    unusedBytes: jsReport?.values.unused ?? null,
    mainThreadMs: jsReport?.values.mainThread ?? null,
    longTaskMs: jsReport?.values.longTasks ?? null,
    loadTimeMs: loadTimeFrom(entry),
    requests,
    scripts: metric ? scriptsFrom(metric) : [],
  };
}

export function resourcesInvestigationsFromItems(
  items: InsightsContextItem[],
): ResourcesInvestigation[] {
  return items.flatMap((entry) => {
    const investigation = buildResourcesInvestigation(inputFromEntry(entry));
    return investigation ? [investigation] : [];
  });
}
