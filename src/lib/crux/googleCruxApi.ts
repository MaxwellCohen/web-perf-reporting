import * as Sentry from "@sentry/nextjs";
import { CruxHistoryReportSchema, CruxReport, cruxReportSchema } from "@/lib/schema";

export type CruxFormFactor = "PHONE" | "TABLET" | "DESKTOP" | "ALL_FORM_FACTORS" | undefined;

const CRUX_CONTENT_QUERY_RECORD =
  "https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json";
const CRUX_QUERY_HISTORY = "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord";

function getChromeUxApiKey(): string | null {
  return process.env.PAGESPEED_INSIGHTS_API ?? null;
}

function requireChromeUxApiKey(): string {
  const apiKey = getChromeUxApiKey();
  if (!apiKey) {
    const err = new Error("PAGESPEED_INSIGHTS_API environment variable is not set");
    Sentry.captureException(err);
    throw err;
  }
  return apiKey;
}

export async function queryCruxCurrentRecord({
  url,
  origin,
  formFactor,
  revalidateSeconds,
}: {
  url?: string;
  origin?: string;
  formFactor: CruxFormFactor;
  revalidateSeconds: number;
}): Promise<CruxReport | null> {
  const apiKey = getChromeUxApiKey();
  if (!apiKey) {
    const err = new Error("PAGESPEED_INSIGHTS_API environment variable is not set");
    Sentry.captureException(err);
    return null;
  }

  try {
    const request = await fetch(`${CRUX_CONTENT_QUERY_RECORD}&key=${apiKey}`, {
      body: JSON.stringify({ url, formFactor, origin }),
      method: "POST",
      next: { revalidate: revalidateSeconds },
    });
    if (!request.ok) {
      throw new Error("Failed to fetch current CRUX data: " + request.statusText);
    }
    const data = (await request.json()) as CruxReport;
    return cruxReportSchema.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

export async function queryCruxHistoryRecord({
  url,
  origin,
  formFactor,
  collectionPeriodCount,
}: {
  url?: string;
  origin?: string;
  formFactor?: CruxFormFactor;
  collectionPeriodCount: number;
}): Promise<unknown> {
  const API_KEY = requireChromeUxApiKey();

  const response = await fetch(`${CRUX_QUERY_HISTORY}?key=${API_KEY}`, {
    body: JSON.stringify({
      url: url || undefined,
      formFactor: formFactor || undefined,
      origin: origin || undefined,
      collectionPeriodCount,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${
        errorData ? ` - ${JSON.stringify(errorData)}` : ""
      }`,
    );
  }

  return response.json();
}

export function parseCruxHistoryResponse(data: unknown) {
  return CruxHistoryReportSchema.parse(data);
}
