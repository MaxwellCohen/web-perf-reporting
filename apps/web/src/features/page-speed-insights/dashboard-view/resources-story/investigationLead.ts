import type { ResourceStageId } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import {
  LONG_TASK_LOAD_FLOOR_MS,
  LONG_TASK_LOAD_SHARE,
  LONG_TASK_MS,
  MAIN_THREAD_MS,
  SCRIPT_BYTES,
  SCRIPT_SHARE,
  THIRD_PARTY_BYTES,
  THIRD_PARTY_SHARE,
  UNUSED_BYTES,
  UNUSED_SHARE,
} from "./investigationThresholds";
import type { FlowStage, InvestigationLead, LeadKind, MergedRow } from "./investigationTypes";
import { percentText, shortLabel } from "./investigationRows";

const LEAD_STAGE: Record<LeadKind, ResourceStageId> = {
  "wasted-download": "unused",
  "script-weight": "scripts",
  "third-party": "arrived",
  "main-thread": "main-thread",
  "heaviest-urls": "arrived",
};

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

export function leadFor(args: {
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

export function stagesFor(args: {
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
