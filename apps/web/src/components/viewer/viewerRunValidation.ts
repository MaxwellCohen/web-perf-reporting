import type { ViewerRunState } from "@/components/viewer/ViewerRunSlot";
import { parseLighthouseViewerGistId } from "@/lib/viewer/lighthouseViewerGist";
import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";

export type RunValidation =
  | { status: "empty" }
  | { status: "valid"; message: string }
  | { status: "invalid"; message: string };

function describeJsonError(error: unknown, text: string): string {
  const message = error instanceof Error ? error.message : "";
  const position = /position (\d+)/.exec(message)?.[1];
  if (position === undefined) return "Invalid JSON";
  const line = text.slice(0, Number(position)).split("\n").length;
  return `Invalid JSON at line ${line}`;
}

/** Classify raw smart-field text as a PSI URL, JSON, or neither. */
export function detectRunInput(raw: string): "psi" | "text" | "unknown" {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return "psi";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "text";
  return "unknown";
}

export function validateRun(run: ViewerRunState): RunValidation {
  if (run.method === "file") {
    return run.jsonFiles.length
      ? { status: "valid", message: `${run.jsonFiles.length} file(s) ready` }
      : { status: "empty" };
  }
  if (run.method === "psi") {
    const value = run.psiUrl.trim();
    if (!value) return { status: "empty" };
    if (parseLighthouseViewerGistId(value)) {
      return { status: "valid", message: "Valid Lighthouse Viewer link" };
    }
    try {
      const url = new URL(value);
      if (
        url.hostname === "pagespeed.web.dev" &&
        url.pathname.startsWith("/analysis/")
      ) {
        return { status: "valid", message: "Valid PSI URL" };
      }
    } catch {
      // fall through
    }
    return { status: "invalid", message: "Not a PageSpeed Insights share URL" };
  }
  const content = run.jsonInputs[0]?.content ?? "";
  if (!content.trim()) return { status: "empty" };
  try {
    parseViewerJsonString(content);
    return { status: "valid", message: "Valid JSON" };
  } catch (error) {
    return { status: "invalid", message: describeJsonError(error, content) };
  }
}
