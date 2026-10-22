import { getHistoricalCruxData, getCurrentCruxData, type formFactor } from "@/lib/services";

const FORM_FACTORS = [undefined, "DESKTOP", "TABLET", "PHONE"] as const;

const SLOTS = FORM_FACTORS.flatMap((formFactor) => {
  const suffix = formFactor ?? "All";
  return [
    { key: `origin${suffix}`, scope: "origin" as const, formFactor },
    { key: `url${suffix}`, scope: "url" as const, formFactor },
  ];
});

type LookupKind = "current" | "history";

function scopeArgs(pageUrl: string, scope: "origin" | "url", formFactor: formFactor) {
  return scope === "origin"
    ? { origin: pageUrl, formFactor }
    : { url: pageUrl, formFactor };
}

export async function runCruxLookup(kind: LookupKind, pageUrl: string) {
  const slots = await Promise.all(
    SLOTS.map(async (slot) => {
      const args = scopeArgs(pageUrl, slot.scope, slot.formFactor);
      if (kind === "current") {
        const report = await getCurrentCruxData(args);
        return { key: slot.key, status: "ready" as const, report };
      }
      const reports = await getHistoricalCruxData(args);
      return { key: slot.key, status: "ready" as const, reports: reports ?? [] };
    }),
  );

  return {
    jobId: crypto.randomUUID(),
    pageUrl,
    kind,
    slots,
  };
}
