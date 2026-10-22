const CRUX_CONTENT_QUERY_RECORD =
  "https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json";
const CRUX_QUERY_HISTORY = "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord";

export class GoogleCruxError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function cruxBody(pageUrl: string, scope: "origin" | "url", formFactor: string, extra?: object) {
  return JSON.stringify({
    ...(scope === "url" ? { url: pageUrl } : { origin: pageUrl }),
    ...(formFactor ? { formFactor } : {}),
    ...extra,
  });
}

export async function queryCruxCurrent(
  apiKey: string,
  pageUrl: string,
  scope: "origin" | "url",
  formFactor: string,
): Promise<unknown> {
  const response = await fetch(`${CRUX_CONTENT_QUERY_RECORD}&key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cruxBody(pageUrl, scope, formFactor),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GoogleCruxError(`CrUX queryRecord failed: ${response.status}`, response.status);
  }
  return response.json();
}

export async function queryCruxHistory(
  apiKey: string,
  pageUrl: string,
  scope: "origin" | "url",
  formFactor: string,
): Promise<unknown> {
  const response = await fetch(`${CRUX_QUERY_HISTORY}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cruxBody(pageUrl, scope, formFactor, { collectionPeriodCount: 40 }),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GoogleCruxError(`CrUX queryHistoryRecord failed: ${response.status}`, response.status);
  }
  return response.json();
}
