import type { TraceRequest } from "./parseTrace";

const NON_RENDER_BLOCKING = new Set(["non_blocking", "dynamically_injected_non_blocking", "potentially_blocking"]);

/**
 * DevTools' RenderBlocking insight predicate (also used by Lighthouse): a
 * request in the navigated frame whose status is blocking, that finished
 * before first paint; `in_body_parser_blocking` only counts at VeryHigh
 * priority or for High-priority scripts.
 */
export function isRenderBlockingRequest(r: TraceRequest, firstPaint: number, frame?: string): boolean {
  if (frame && r.frame && r.frame !== frame) return false;
  if (NON_RENDER_BLOCKING.has(r.renderBlocking ?? "non_blocking")) return false;
  if (r.end > firstPaint + 0.5) return false;
  if (r.renderBlocking === "in_body_parser_blocking") {
    return r.priority === "VeryHigh" || (r.resourceType === "Script" && r.priority === "High");
  }
  return true;
}
