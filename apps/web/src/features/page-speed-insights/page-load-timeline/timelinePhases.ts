import type { CombinedLoad } from "./collectTimelineSources";
import type { PhaseId } from "./types";

export const PHASE_ORDER: PhaseId[] = [
  "navigation",
  "connection",
  "requestResponse",
  "parsingHead",
  "firstRender",
  "parsingComplete",
  "subresources",
  "afterLoad",
];

const PHASE_TITLES: Record<PhaseId, string> = {
  navigation: "Navigation start",
  connection: "Connection",
  requestResponse: "Request / response",
  parsingHead: "Parsing the head",
  firstRender: "First render",
  parsingComplete: "Parsing complete",
  subresources: "Subresources finish",
  afterLoad: "After load",
};

export type PhaseBound = {
  id: PhaseId;
  title: string;
  startMs: number;
};

export function phaseBounds(load: CombinedLoad): PhaseBound[] {
  const docStart = load.document?.networkRequestTime ?? 0;
  const docEnd = load.document?.networkEndTime;
  const parseStart = load.ttfb ?? docStart;
  const loadTime = load.load ?? load.lcp ?? 0;
  const hasPreconnect = load.preconnectCandidates.length > 0;

  const bounds: PhaseBound[] = [{ id: "navigation", title: PHASE_TITLES.navigation, startMs: 0 }];
  if (hasPreconnect) {
    bounds.push({ id: "connection", title: PHASE_TITLES.connection, startMs: docStart });
  }
  bounds.push(
    { id: "requestResponse", title: PHASE_TITLES.requestResponse, startMs: docStart },
    { id: "parsingHead", title: PHASE_TITLES.parsingHead, startMs: parseStart },
    {
      id: "firstRender",
      title: PHASE_TITLES.firstRender,
      startMs: docEnd ?? load.ttfb ?? 0,
    },
    {
      id: "parsingComplete",
      title: PHASE_TITLES.parsingComplete,
      startMs: load.dcl ?? load.fcp ?? 0,
    },
    {
      id: "subresources",
      title: PHASE_TITLES.subresources,
      startMs: load.fcp ?? load.dcl ?? 0,
    },
    { id: "afterLoad", title: PHASE_TITLES.afterLoad, startMs: loadTime },
  );

  return bounds;
}

export function phaseActiveAt(bounds: PhaseBound[], timeMs: number): PhaseBound {
  let active = bounds[0]!;
  for (const phase of bounds) {
    if (phase.startMs <= timeMs) active = phase;
  }
  return active;
}
