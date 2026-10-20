import { describe, expect, it } from "vitest";
import { allTaskFilters } from "@/features/page-speed-insights/page-load-timeline/filterTimelineMoments";
import { filterWaterfallRowsByTasks } from "@/features/page-speed-insights/waterfall/filterWaterfallByTasks";
import type { WaterfallRow } from "@/features/page-speed-insights/waterfall/waterfallData";

function request(
  id: string,
  renderBlocking: WaterfallRow["renderBlocking"],
  resourceType = "Script",
): WaterfallRow {
  return {
    id,
    kind: "request",
    label: id,
    url: `https://example.com/${id}`,
    resourceType,
    renderBlocking,
    networkStart: 0,
    networkEnd: 10,
    duration: 10,
  };
}

describe("filterWaterfallRowsByTasks", () => {
  it("keeps everything when all filters are enabled", () => {
    const rows = [
      request("a", "blocking"),
      request("b", "non-blocking"),
      {
        id: "t",
        kind: "task" as const,
        label: "Task",
        resourceType: "Task",
        renderBlocking: "blocking" as const,
        networkStart: 0,
        networkEnd: 60,
        duration: 60,
        segments: [{ id: "t0", start: 0, end: 60, taskKind: "long" as const }],
      },
    ];
    expect(filterWaterfallRowsByTasks(rows, allTaskFilters())).toHaveLength(3);
  });

  it("hides non-blocking requests and long tasks when those filters are off", () => {
    const rows = [
      request("doc", "non-blocking", "Document"),
      request("css", "blocking", "Stylesheet"),
      request("img", "non-blocking", "Image"),
      {
        id: "t",
        kind: "task" as const,
        label: "Task",
        resourceType: "Task",
        renderBlocking: "blocking" as const,
        networkStart: 0,
        networkEnd: 60,
        duration: 60,
        segments: [{ id: "t0", start: 0, end: 60, taskKind: "long" as const }],
      },
    ];
    const enabled = new Set(["blocking"] as const);
    const filtered = filterWaterfallRowsByTasks(rows, enabled);
    expect(filtered.map((row) => row.id)).toEqual(["doc", "css"]);
  });
});
