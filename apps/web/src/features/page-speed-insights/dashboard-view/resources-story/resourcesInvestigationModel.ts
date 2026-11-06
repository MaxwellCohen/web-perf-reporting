import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { ResourcesInvestigation, ResourcesInvestigationInput } from "./investigationTypes";
import { mergeRows, positive, suspectsFrom, weightNodes } from "./investigationRows";
import { leadFor, stagesFor } from "./investigationLead";
import { inputFromEntry } from "./investigationInput";

export type {
  ActionHint,
  ResourcesInvestigationInput,
  FlowStage,
  WeightNode,
  ResourceSuspect,
  InvestigationMetrics,
  ResourcesInvestigation,
} from "./investigationTypes";

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

export function resourcesInvestigationsFromItems(
  items: InsightsContextItem[],
): ResourcesInvestigation[] {
  return items.flatMap((entry) => {
    const investigation = buildResourcesInvestigation(inputFromEntry(entry));
    return investigation ? [investigation] : [];
  });
}
