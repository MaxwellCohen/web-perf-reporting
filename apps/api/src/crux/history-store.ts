import { and, asc, createDb, eq } from "void/db";
import { historicalMetrics } from "../../db/schema";
import type { ApiBindings } from "../bindings";
import { isHistoryFresh, newestToMs } from "./freshness";
import { formatCruxDate, historyResponseToReports, type CruxHistoryResponse } from "./history-reports";
import { historyScopeColumns, type CruxSlot } from "./slots";

function database(env: ApiBindings) {
  return createDb(env.DB);
}

export async function readHistory(
  env: ApiBindings,
  pageUrl: string,
  slot: CruxSlot,
): Promise<{ reports: Record<string, unknown>[]; fresh: boolean }> {
  const scope = historyScopeColumns(pageUrl, slot);
  const rows = await database(env)
    .select({ data: historicalMetrics.data, date2: historicalMetrics.date2 })
    .from(historicalMetrics)
    .where(
      and(
        eq(historicalMetrics.url, scope.url),
        eq(historicalMetrics.origin, scope.origin),
        eq(historicalMetrics.formFactor, slot.formFactor),
      ),
    )
    .orderBy(asc(historicalMetrics.date2));

  const newest = rows.at(-1)?.date2 ?? null;
  return {
    reports: rows.map((row) => row.data),
    fresh: isHistoryFresh(newest, Date.now()),
  };
}

export async function saveHistoryReports(
  env: ApiBindings,
  pageUrl: string,
  slot: CruxSlot,
  raw: unknown,
): Promise<number> {
  const parsed = raw as CruxHistoryResponse;
  if (!parsed?.record?.collectionPeriods) return 0;
  const reports = historyResponseToReports(parsed);
  if (!reports.length) return 0;

  const scope = historyScopeColumns(pageUrl, slot);
  await database(env)
    .insert(historicalMetrics)
    .values(
      reports.map((data) => {
        const record = data.record as {
          collectionPeriod: { lastDate: { year: number; month: number; day: number } };
        };
        const lastDate = record.collectionPeriod.lastDate;
        const date = formatCruxDate(lastDate);
        return {
          id: `${scope.url}-${scope.origin}-${slot.formFactor}-${date}`,
          url: scope.url,
          origin: scope.origin,
          formFactor: slot.formFactor,
          date,
          date2: new Date(lastDate.year, lastDate.month - 1, lastDate.day),
          data,
        };
      }),
    )
    .onConflictDoNothing({
      target: [
        historicalMetrics.url,
        historicalMetrics.formFactor,
        historicalMetrics.origin,
        historicalMetrics.date,
      ],
    });

  return reports.length;
}

export function historyRowBytes(data: unknown): number {
  if (typeof data === "string") return data.length;
  return JSON.stringify(data).length;
}

export { newestToMs };
