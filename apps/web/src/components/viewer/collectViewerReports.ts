import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { PageSpeedInsights } from "@/lib/schema";
import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";
import {
  prefixPsiReportLabels,
  resolvePsiRunLabels,
} from "@/lib/viewer/psiCompareLabels";

export type PsiRunInput = {
  url: string;
  label?: string;
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

async function collectPsiRuns(
  primary: PsiRunInput,
  compare?: PsiRunInput | null,
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  const compareUrl = compare?.url?.trim() ?? "";
  if (!compareUrl) {
    return importPsiShare(primary.url);
  }

  const [runA, runB] = resolvePsiRunLabels(primary.label, compare?.label);
  const [resultA, resultB] = await Promise.all([
    importPsiShare(primary.url),
    importPsiShare(compareUrl),
  ]);

  return {
    data: [...resultA.data, ...resultB.data],
    labels: [
      ...prefixPsiReportLabels(resultA.labels, runA),
      ...prefixPsiReportLabels(resultB.labels, runB),
    ],
  };
}

function toPsiRunInput(psiShareUrl: string | PsiRunInput): PsiRunInput {
  if (typeof psiShareUrl === "string") {
    return { url: psiShareUrl };
  }
  return psiShareUrl;
}

export async function collectViewerReports(
  activeTab: string,
  jsonInputs: LhJsonTextEntry[],
  jsonFiles: LhJsonFileEntry[],
  psiShareUrl: string | PsiRunInput = "",
  psiCompare?: PsiRunInput | null,
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
  if (activeTab === "psi") {
    return collectPsiRuns(toPsiRunInput(psiShareUrl), psiCompare);
  }

  const data: PageSpeedInsights[] = [];
  const labels: string[] = [];

  if (activeTab === "file") {
    if (jsonFiles.length === 0) {
      throw new Error("Please upload at least one JSON file");
    }

    for (const fileEntry of jsonFiles) {
      const fileContent = await fileEntry.file.text();
      const reports = parseViewerJsonString(fileContent);
      const label = fileEntry.name.trim() || fileEntry.file.name.replace(/\.[^/.]+$/, "");
      for (const report of reports) {
        data.push(report);
        labels.push(reports.length > 1 ? `${label} (${labels.length + 1})` : label);
      }
    }
  } else {
    const filledInputs = jsonInputs.filter((input) => input.content.trim());
    if (filledInputs.length === 0) {
      throw new Error("Please add at least one JSON entry");
    }

    for (const [index, input] of filledInputs.entries()) {
      const reports = parseViewerJsonString(input.content);
      const label = input.name.trim() || `Report ${index + 1}`;
      for (const report of reports) {
        data.push(report);
        labels.push(reports.length > 1 ? `${label} (${labels.length + 1})` : label);
      }
    }
  }

  return { data, labels };
}
