import type { ResourceStageId } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";

export type LeadKind =
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

export type InvestigationScript = {
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

export type InvestigationLead = {
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

export type MergedRow = {
  url: string;
  resourceType: string;
  transferSize: number;
  unusedBytes: number;
  bootupMs: number;
  thirdParty: boolean;
  entity?: string;
};
