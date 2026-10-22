export const CRUX_SLOT_KEYS = [
  "originAll",
  "urlAll",
  "originDESKTOP",
  "urlDESKTOP",
  "originTABLET",
  "urlTABLET",
  "originPHONE",
  "urlPHONE",
] as const;

export type CruxSlotKey = (typeof CRUX_SLOT_KEYS)[number];

export type CruxSlot = {
  key: CruxSlotKey;
  scope: "origin" | "url";
  /** Empty string is the all-form-factors scope stored in Historical_Metrics. */
  formFactor: "" | "DESKTOP" | "TABLET" | "PHONE";
};

const FACTORS = [
  { suffix: "All", formFactor: "" },
  { suffix: "DESKTOP", formFactor: "DESKTOP" },
  { suffix: "TABLET", formFactor: "TABLET" },
  { suffix: "PHONE", formFactor: "PHONE" },
] as const;

/** Same order as the dashboard grid: each form factor, origin then url. */
export function cruxSlots(): CruxSlot[] {
  return FACTORS.flatMap((factor) => [
    {
      key: `origin${factor.suffix}` as CruxSlotKey,
      scope: "origin" as const,
      formFactor: factor.formFactor,
    },
    {
      key: `url${factor.suffix}` as CruxSlotKey,
      scope: "url" as const,
      formFactor: factor.formFactor,
    },
  ]);
}

export function currentCacheKey(pageUrl: string, slot: CruxSlot): string {
  return `crux-current:v1:${slot.scope}:${slot.formFactor}:${pageUrl}`;
}

export function historyEmptyKey(pageUrl: string, slot: CruxSlot): string {
  return `crux-history-empty:v1:${slot.scope}:${slot.formFactor}:${pageUrl}`;
}

export function inflightKey(kind: "current" | "history", pageUrl: string, slot: CruxSlot): string {
  return `crux-inflight:${kind}:${slot.scope}:${slot.formFactor}:${pageUrl}`;
}

export function slotFailureKey(jobId: string, slotKey: CruxSlotKey): string {
  return `crux-fail:${jobId}:${slotKey}`;
}

export function historyScopeColumns(pageUrl: string, slot: CruxSlot): { url: string; origin: string } {
  if (slot.scope === "origin") {
    return { url: "", origin: pageUrl };
  }
  return { url: pageUrl, origin: "" };
}
