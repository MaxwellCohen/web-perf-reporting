import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { PageSpeedInsights } from "@/lib/schema";
import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";
import {
  prefixPsiReportLabels,
  resolvePsiRunLabels,
} from "@/lib/viewer/psiCompareLabels";

export type ViewerRunMethod = "psi" | "file" | "text";

export type ViewerRunInput = {
  method: ViewerRunMethod;
  label?: string;
  psiUrl?: string;
  jsonFiles?: LhJsonFileEntry[];
  jsonInputs?: LhJsonTextEntry[];
};

async function importPsiShare(
  url: string,
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Enter a PageSpeed Insights share URL");
  }

  const response = await fetch("/api/viewer/psi-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  });

  let payload: { data?: PageSpeedInsights[]; labels?: string[]; error?: string } | null = null;
  try {
    payload = (await response.json()) as {
      data?: PageSpeedInsights[];
      labels?: string[];
      error?: string;
    };
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.data?.length || !payload.labels) {
    throw new Error(payload?.error || "Could not import PageSpeed report");
  }

  return { data: payload.data, labels: payload.labels };
}

async function collectFileRun(
  jsonFiles: LhJsonFileEntry[],
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  if (jsonFiles.length === 0) {
    throw new Error("Please upload at least one JSON file");
  }

  const data: PageSpeedInsights[] = [];
  const labels: string[] = [];

  for (const fileEntry of jsonFiles) {
    const fileContent = await fileEntry.file.text();
    const reports = parseViewerJsonString(fileContent);
    const label = fileEntry.name.trim() || fileEntry.file.name.replace(/\.[^/.]+$/, "");
    for (const report of reports) {
      data.push(report);
      labels.push(reports.length > 1 ? `${label} (${labels.length + 1})` : label);
    }
  }

  return { data, labels };
}

async function collectTextRun(
  jsonInputs: LhJsonTextEntry[],
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  const filledInputs = jsonInputs.filter((input) => input.content.trim());
  if (filledInputs.length === 0) {
    throw new Error("Please add at least one JSON entry");
  }

  const data: PageSpeedInsights[] = [];
  const labels: string[] = [];

  for (const [index, input] of filledInputs.entries()) {
    const reports = parseViewerJsonString(input.content);
    const label = input.name.trim() || `Report ${index + 1}`;
    for (const report of reports) {
      data.push(report);
      labels.push(reports.length > 1 ? `${label} (${labels.length + 1})` : label);
    }
  }

  return { data, labels };
}

async function collectOneRun(
  run: ViewerRunInput,
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  if (run.method === "psi") {
    return importPsiShare(run.psiUrl ?? "");
  }
  if (run.method === "file") {
    return collectFileRun(run.jsonFiles ?? []);
  }
  return collectTextRun(run.jsonInputs ?? []);
}

export async function collectViewerReports(
  runs: ViewerRunInput[],
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  if (runs.length === 0) {
    throw new Error("Add at least one run");
  }
  if (runs.length > 2) {
    throw new Error("At most two runs can be compared");
  }

  if (runs.length === 1) {
    return collectOneRun(runs[0]!);
  }

  const [runAInput, runBInput] = runs;
  const [runA, runB] = resolvePsiRunLabels(runAInput!.label, runBInput!.label);
  const [resultA, resultB] = await Promise.all([
    collectOneRun(runAInput!),
    collectOneRun(runBInput!),
  ]);

  return {
    data: [...resultA.data, ...resultB.data],
    labels: [
      ...prefixPsiReportLabels(resultA.labels, runA),
      ...prefixPsiReportLabels(resultB.labels, runB),
    ],
  };
}
