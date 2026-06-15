import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { PageSpeedInsights } from "@/lib/schema";
import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";

export async function collectViewerReports(
  activeTab: string,
  jsonInputs: LhJsonTextEntry[],
  jsonFiles: LhJsonFileEntry[],
): Promise<{ data: PageSpeedInsights[]; labels: string[] }> {
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
