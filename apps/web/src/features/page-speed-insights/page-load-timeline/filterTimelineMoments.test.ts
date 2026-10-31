import { describe, expect, it } from "vitest";
import {
  TASK_FILTERS,
  availableTaskFilters,
  filterTimelineMoments,
  type TaskFilterId,
} from "./filterTimelineMoments";
import type { TimelineEvent, TimelineWaterfallBar } from "./types";

function moment(
  partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "phaseId">,
): TimelineEvent {
  return {
    phaseTitle: partial.phaseId,
    timeMs: 0,
    title: partial.id,
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
    ...partial,
  };
}

function bar(
  id: string,
  renderBlocking: TimelineWaterfallBar["renderBlocking"],
  resourceType = "Image",
): TimelineWaterfallBar {
  return { id, label: id, startMs: 0, endMs: 10, resourceType, renderBlocking };
}

function without(id: TaskFilterId) {
  const enabled = new Set(TASK_FILTERS);
  enabled.delete(id);
  return enabled;
}

describe("filterTimelineMoments", () => {
  it("returns the same list when every task filter is on", () => {
    const moments = [moment({ id: "fcp", phaseId: "firstRender" })];
    expect(filterTimelineMoments(moments, new Set(TASK_FILTERS))).toBe(moments);
  });

  it("hides non-blocking downloads and keeps the document, milestones, and other tasks", () => {
    const document = moment({
      id: "net-0",
      phaseId: "requestResponse",
      title: "Document",
      waterfall: [bar("doc", "non-blocking", "Document")],
    });
    const image = moment({
      id: "net-1",
      phaseId: "subresources",
      title: "Image",
      isPhaseStart: true,
      waterfall: [bar("hero", "non-blocking")],
    });
    const stylesheet = moment({
      id: "net-2",
      phaseId: "subresources",
      title: "Stylesheet",
      waterfall: [bar("css", "potentially-blocking", "Stylesheet")],
    });
    const longTask = moment({ id: "long-task-0", phaseId: "subresources", title: "Long task" });
    const fcp = moment({ id: "fcp", phaseId: "firstRender", title: "FCP", isPhaseStart: true });

    const visible = filterTimelineMoments(
      [fcp, document, image, stylesheet, longTask],
      without("non-blocking"),
    );

    expect(visible.map((item) => item.id)).toEqual(["fcp", "net-0", "net-2", "long-task-0"]);
  });

  it("drops hidden requests inside a mixed group and shifts the phase header", () => {
    const mixed = moment({
      id: "net-1",
      phaseId: "subresources",
      title: "Image",
      isPhaseStart: true,
      detail: "2 image requests.",
      waterfall: [bar("hero", "non-blocking"), bar("logo", "blocking")],
      table: {
        headers: [{ text: "URL" }],
        rows: [[{ text: "hero" }], [{ text: "logo" }]],
      },
    });
    const screenshot = moment({
      id: "screenshot-0",
      phaseId: "subresources",
      title: "Screenshot",
    });

    const visible = filterTimelineMoments([mixed, screenshot], without("non-blocking"));

    expect(visible).toHaveLength(2);
    expect(visible[0]?.waterfall?.map((item) => item.id)).toEqual(["logo"]);
    expect(visible[0]?.table?.rows).toEqual([[{ text: "logo" }]]);
    expect(visible[0]?.detail).toBe("2 image requests (1 hidden).");
    expect(visible[0]?.isPhaseStart).toBe(true);
    expect(visible[1]?.isPhaseStart).toBe(false);
  });

  it("moves the phase header onto the next visible moment", () => {
    const image = moment({
      id: "net-1",
      phaseId: "subresources",
      isPhaseStart: true,
      waterfall: [bar("hero", "non-blocking")],
    });
    const fcp = moment({ id: "fcp", phaseId: "subresources", title: "FCP" });

    const visible = filterTimelineMoments([image, fcp], without("non-blocking"));

    expect(visible.map((item) => item.id)).toEqual(["fcp"]);
    expect(visible[0]?.isPhaseStart).toBe(true);
  });

  it("hides long tasks without hiding downloads", () => {
    const longTask = moment({ id: "long-task-0", phaseId: "subresources" });
    const script = moment({
      id: "net-3",
      phaseId: "subresources",
      waterfall: [bar("app.js", "blocking", "Script")],
    });

    const visible = filterTimelineMoments([script, longTask], without("long-task"));

    expect(visible.map((item) => item.id)).toEqual(["net-3"]);
  });

  it("hides short tasks with the potentially-blocking filter", () => {
    const shortTask = moment({
      id: "short-task-0",
      phaseId: "subresources",
      title: "Short task",
      kind: "potentially-blocking",
    });
    const longTask = moment({ id: "long-task-0", phaseId: "subresources", title: "Long task" });
    const script = moment({
      id: "net-3",
      phaseId: "subresources",
      waterfall: [bar("app.js", "blocking", "Script")],
    });

    const visible = filterTimelineMoments(
      [script, shortTask, longTask],
      without("potentially-blocking"),
    );

    expect(visible.map((item) => item.id)).toEqual(["net-3", "long-task-0"]);
  });

  it("lists only filters that appear on subresource tasks", () => {
    const moments = [
      moment({
        id: "net-0",
        phaseId: "requestResponse",
        waterfall: [bar("doc", "non-blocking", "Document")],
      }),
      moment({
        id: "net-1",
        phaseId: "subresources",
        waterfall: [bar("hero", "non-blocking")],
      }),
      moment({ id: "long-task-0", phaseId: "subresources" }),
      moment({ id: "short-task-0", phaseId: "subresources", kind: "potentially-blocking" }),
    ];

    expect(availableTaskFilters(moments)).toEqual([
      "potentially-blocking",
      "non-blocking",
      "long-task",
    ]);
  });
});
