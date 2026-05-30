import * as Sentry from "@sentry/nextjs";
import { PageSpeedInsightsTable } from "@/db/schema";
import { db } from "@/db";
import { and, eq, gt } from "drizzle-orm";

type FormFactor = "DESKTOP" | "MOBILE";

/** Legacy Google PageSpeed API URL builder (not used in the saved-report worker flow). */
export async function getPageSpeedDataUrl(testURL: string, formFactor: FormFactor) {
  const baseurl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  baseurl.searchParams.append("url", testURL);
  ["ACCESSIBILITY", "BEST_PRACTICES", "PERFORMANCE", "PWA", "SEO"].forEach((category) =>
    baseurl.searchParams.append("category", category),
  );
  baseurl.searchParams.append("key", process.env.PAGESPEED_INSIGHTS_API ?? "");
  if (formFactor) {
    baseurl.searchParams.append("strategy", formFactor);
  }
  return baseurl.toString();
}

/** Legacy Drizzle cache lookup (not used in the saved-report worker flow). */
export const getSavedPageSpeedData = async (url: string) => {
  try {
    const result = await db.query.PageSpeedInsightsTable.findFirst({
      columns: { status: true, data: true },
      where: (PageSpeedInsightsTable, { eq: eqFn, and: andFn }) =>
        andFn(
          eqFn(PageSpeedInsightsTable.url, url),
          gt(PageSpeedInsightsTable.date, new Date(Date.now() - 21_600_000)),
        ),
    });
    return result;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};
