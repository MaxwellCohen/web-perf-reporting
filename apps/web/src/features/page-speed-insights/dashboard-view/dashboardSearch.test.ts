import { afterEach, describe, expect, it } from "vitest";
import {
  applyDashboardSearchPatch,
  narrowLabelFilter,
  parseDashboardSearch,
  patchDashboardSearch,
  redirectSearchString,
  toSearchString,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";

describe("dashboardSearch", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("defaults when the query is empty", () => {
    expect(parseDashboardSearch("")).toMatchObject({
      view: null,
      tab: "overview",
      labels: [],
      report: "",
      categories: [],
      priorities: [],
      expanded: [],
      types: [],
      sort: "start",
      height: "default",
      query: "",
      audit: "",
      open: null,
      groups: [],
      tasks: null,
    });
  });

  it("reads layout, tab, filters, and explicit empty lists", () => {
    const state = parseDashboardSearch(
      "?view=classic&tab=timeline&labels=Mobile&report=Desktop&category=Performance&priority=high&expand=rec-1&type=script&type=image&sort=duration&height=large&q=hero&audit=lcp&open=&groups=performance&tasks=",
    );

    expect(state).toMatchObject({
      view: "classic",
      tab: "timeline",
      labels: ["Mobile"],
      report: "Desktop",
      categories: ["Performance"],
      priorities: ["high"],
      expanded: ["rec-1"],
      types: ["script", "image"],
      sort: "duration",
      height: "large",
      query: "hero",
      audit: "lcp",
      open: [],
      groups: ["performance"],
      tasks: [],
    });
  });

  it("ignores unknown layout and tab values", () => {
    expect(parseDashboardSearch("?view=compact&tab=nope")).toMatchObject({
      view: null,
      tab: "overview",
    });
  });

  it("omits default filters and keeps unrelated params", () => {
    const next = applyDashboardSearchPatch(new URLSearchParams("utm=spring&tab=timeline"), {
      view: "dashboard",
      tab: "overview",
      labels: [],
      sort: "start",
      height: "default",
      query: "",
      open: null,
      tasks: ["blocking", "long-task"],
    });

    expect(next.get("utm")).toBe("spring");
    expect(next.get("view")).toBe("dashboard");
    expect(next.has("tab")).toBe(false);
    expect(next.getAll("tasks")).toEqual(["blocking", "long-task"]);
  });

  it("writes an explicit collapsed accordion and cleared task filters", () => {
    const next = applyDashboardSearchPatch(new URLSearchParams("open=cwv&tasks=blocking"), {
      open: [],
      tasks: [],
    });

    expect(next.getAll("open")).toEqual([""]);
    expect(next.getAll("tasks")).toEqual([""]);
    expect(parseDashboardSearch(`?${next.toString()}`)).toMatchObject({ open: [], tasks: [] });
  });

  it("treats a full label set as no filter", () => {
    expect(narrowLabelFilter(["Desktop", "Mobile"], ["Mobile", "Desktop"])).toBeNull();
    expect(narrowLabelFilter(["Desktop"], ["Mobile", "Desktop"])).toEqual(["Desktop"]);
  });

  it("builds a search string and forwards only dashboard params on redirect", () => {
    expect(toSearchString({ url: "https://example.com", tab: "network" })).toBe(
      "?url=https%3A%2F%2Fexample.com&tab=network",
    );
    expect(
      redirectSearchString({
        url: "https://example.com",
        view: "dashboard",
        tab: ["timeline"],
        labels: ["Mobile", "Desktop"],
      }),
    ).toBe("?view=dashboard&tab=timeline&labels=Mobile&labels=Desktop");
  });

  it("updates the address bar without dropping the hash", () => {
    window.history.replaceState(null, "", "/page-speed/report#payload");

    patchDashboardSearch({ view: "classic", tab: "audits" }, "push");

    expect(window.location.pathname).toBe("/page-speed/report");
    expect(window.location.hash).toBe("#payload");
    expect(parseDashboardSearch(window.location.search)).toMatchObject({
      view: "classic",
      tab: "audits",
    });
  });
});
