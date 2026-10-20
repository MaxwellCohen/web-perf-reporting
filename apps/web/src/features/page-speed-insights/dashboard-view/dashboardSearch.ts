/**
 * Shareable PSI dashboard state lives in the query string.
 *
 * view=dashboard|classic
 * tab=timeline|loading|network|javascript|recommendations|audits (overview is the default)
 * labels, category, priority, expand, type, groups — repeatable; omitted means "all" or "none"
 * report — timeline and waterfall report label
 * tasks — timeline task filters; omitted means all on; `tasks=` means all off
 * sort=start|end|duration|size  height=default|large|xl|full  rows=expanded|collapsed
 * blocking=1 — waterfall shows blocking items only
 * signal — waterfall row signals (critical chain, queue, long tasks, …); omitted means no signal filter
 * q=  audit=
 * open — accordion sections; omitted means the tab default; `open=` means all collapsed
 */

export const DASHBOARD_TABS = [
  "overview",
  "timeline",
  "loading",
  "network",
  "javascript",
  "recommendations",
  "audits",
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export const DASHBOARD_SORTS = ["start", "end", "duration", "size"] as const;
export type DashboardSort = (typeof DASHBOARD_SORTS)[number];

export const DASHBOARD_HEIGHTS = ["default", "large", "xl", "full"] as const;
export type DashboardHeight = (typeof DASHBOARD_HEIGHTS)[number];

export const DASHBOARD_ROW_DENSITIES = ["expanded", "collapsed"] as const;
export type DashboardRowDensity = (typeof DASHBOARD_ROW_DENSITIES)[number];

export const DASHBOARD_SEARCH_KEYS = [
  "view",
  "tab",
  "labels",
  "report",
  "category",
  "priority",
  "expand",
  "type",
  "sort",
  "height",
  "rows",
  "blocking",
  "signal",
  "q",
  "audit",
  "open",
  "groups",
  "tasks",
] as const;

const DASHBOARD_SEARCH_EVENT = "dashboard-search";

export type DashboardViewMode = "dashboard" | "classic";

export type DashboardSearchState = {
  view: DashboardViewMode | null;
  tab: DashboardTab;
  labels: string[];
  report: string;
  categories: string[];
  priorities: string[];
  expanded: string[];
  types: string[];
  sort: DashboardSort;
  height: DashboardHeight;
  rows: DashboardRowDensity;
  /** Waterfall: only render-blocking / main-thread task rows. */
  blockingOnly: boolean;
  /** Waterfall signals. Empty means every row. */
  signals: string[];
  query: string;
  audit: string;
  open: string[] | null;
  groups: string[];
  tasks: string[] | null;
};

export type DashboardSearchPatch = {
  view?: DashboardViewMode | null;
  tab?: DashboardTab | null;
  labels?: string[] | null;
  report?: string | null;
  categories?: string[] | null;
  priorities?: string[] | null;
  expanded?: string[] | null;
  types?: string[] | null;
  sort?: DashboardSort | null;
  height?: DashboardHeight | null;
  rows?: DashboardRowDensity | null;
  blockingOnly?: boolean | null;
  /** null or [] clears the waterfall signal filter. */
  signals?: string[] | null;
  query?: string | null;
  audit?: string | null;
  /** null uses the section default; [] collapses every section. */
  open?: string[] | null;
  groups?: string[] | null;
  /** null shows every task; [] hides every task filter. */
  tasks?: string[] | null;
};

type SearchRecord = { [key: string]: string | string[] | undefined };

export function isDashboardViewMode(value: unknown): value is DashboardViewMode {
  return value === "dashboard" || value === "classic";
}

export function isDashboardTab(value: unknown): value is DashboardTab {
  return typeof value === "string" && (DASHBOARD_TABS as readonly string[]).includes(value);
}

function isSort(value: string | null): value is DashboardSort {
  return value != null && (DASHBOARD_SORTS as readonly string[]).includes(value);
}

function isHeight(value: string | null): value is DashboardHeight {
  return value != null && (DASHBOARD_HEIGHTS as readonly string[]).includes(value);
}

function isRowDensity(value: string | null): value is DashboardRowDensity {
  return value != null && (DASHBOARD_ROW_DENSITIES as readonly string[]).includes(value);
}

function readList(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter((value) => value.length > 0);
}

function readNullableList(params: URLSearchParams, key: string): string[] | null {
  if (!params.has(key)) return null;
  return readList(params, key);
}

export function parseDashboardSearch(search: string): DashboardSearchState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view = params.get("view");
  const tab = params.get("tab");
  const sort = params.get("sort");
  const height = params.get("height");
  const rows = params.get("rows");

  return {
    view: isDashboardViewMode(view) ? view : null,
    tab: isDashboardTab(tab) ? tab : "overview",
    labels: readList(params, "labels"),
    report: params.get("report") ?? "",
    categories: readList(params, "category"),
    priorities: readList(params, "priority"),
    expanded: readList(params, "expand"),
    types: readList(params, "type"),
    sort: isSort(sort) ? sort : "start",
    height: isHeight(height) ? height : "default",
    rows: isRowDensity(rows) ? rows : "expanded",
    blockingOnly: params.get("blocking") === "1",
    signals: readList(params, "signal"),
    query: params.get("q") ?? "",
    audit: params.get("audit") ?? "",
    open: readNullableList(params, "open"),
    groups: readList(params, "groups"),
    tasks: readNullableList(params, "tasks"),
  };
}

function writeList(
  params: URLSearchParams,
  key: string,
  values: string[] | null,
  empty: "delete" | "blank",
) {
  params.delete(key);
  if (values == null || values.length === 0) {
    if (values && empty === "blank") params.set(key, "");
    return;
  }
  for (const value of values) {
    if (value) params.append(key, value);
  }
}

function writeText(params: URLSearchParams, key: string, value: string | null) {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function applyDashboardSearchPatch(
  current: URLSearchParams,
  patch: DashboardSearchPatch,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (patch.view !== undefined) writeText(next, "view", patch.view);
  if (patch.tab !== undefined)
    writeText(next, "tab", patch.tab && patch.tab !== "overview" ? patch.tab : null);
  if (patch.labels !== undefined) writeList(next, "labels", patch.labels, "delete");
  if (patch.report !== undefined) writeText(next, "report", patch.report);
  if (patch.categories !== undefined) writeList(next, "category", patch.categories, "delete");
  if (patch.priorities !== undefined) writeList(next, "priority", patch.priorities, "delete");
  if (patch.expanded !== undefined) writeList(next, "expand", patch.expanded, "delete");
  if (patch.types !== undefined) writeList(next, "type", patch.types, "delete");
  if (patch.sort !== undefined)
    writeText(next, "sort", patch.sort && patch.sort !== "start" ? patch.sort : null);
  if (patch.height !== undefined) {
    writeText(next, "height", patch.height && patch.height !== "default" ? patch.height : null);
  }
  if (patch.rows !== undefined) {
    writeText(next, "rows", patch.rows && patch.rows !== "expanded" ? patch.rows : null);
  }
  if (patch.blockingOnly !== undefined) {
    writeText(next, "blocking", patch.blockingOnly ? "1" : null);
  }
  if (patch.signals !== undefined) writeList(next, "signal", patch.signals, "delete");
  if (patch.query !== undefined) writeText(next, "q", patch.query);
  if (patch.audit !== undefined) writeText(next, "audit", patch.audit);
  if (patch.open !== undefined) writeList(next, "open", patch.open, "blank");
  if (patch.groups !== undefined) writeList(next, "groups", patch.groups, "delete");
  if (patch.tasks !== undefined) writeList(next, "tasks", patch.tasks, "blank");

  return next;
}

function appendRecordValue(
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) {
  if (typeof value === "string") params.append(key, value);
  else if (Array.isArray(value)) {
    for (const entry of value) params.append(key, entry);
  }
}

export function toSearchString(params: SearchRecord): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) appendRecordValue(next, key, value);
  const search = next.toString();
  return search ? `?${search}` : "";
}

export function redirectSearchString(params: SearchRecord): string {
  const next = new URLSearchParams();
  for (const key of DASHBOARD_SEARCH_KEYS) appendRecordValue(next, key, params[key]);
  const search = next.toString();
  return search ? `?${search}` : "";
}

export function sameStringList(left: string[] | null, right: string[] | null): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/** Subset of labels worth putting in the URL. Null means every label is shown. */
export function narrowLabelFilter(selected: string[] | null, available: string[]): string[] | null {
  if (!available.length || !selected?.length || selected.length >= available.length) return null;
  const known = available.filter((label) => selected.includes(label));
  if (!known.length || known.length >= available.length) return null;
  return known;
}

export function patchDashboardSearch(
  patch: DashboardSearchPatch,
  history: "push" | "replace" = "replace",
) {
  if (typeof window === "undefined") return;
  const next = applyDashboardSearchPatch(new URLSearchParams(window.location.search), patch);
  const search = next.toString();
  const current = window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : window.location.search;
  if (search === current) return;

  const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  if (history === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(DASHBOARD_SEARCH_EVENT));
}

export function subscribeDashboardSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(DASHBOARD_SEARCH_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(DASHBOARD_SEARCH_EVENT, onStoreChange);
  };
}

export function readLocationSearch() {
  return window.location.search;
}
