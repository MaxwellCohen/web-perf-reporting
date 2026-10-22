import { PAGESPEED_API_BASE_URL, PAGESPEED_CATEGORIES, strategyToFormFactor, type PageSpeedStrategy } from "./constants";

export async function fetchPageSpeedData(
  requestUrl: string,
  strategy: PageSpeedStrategy,
  apiKey: string,
): Promise<unknown> {
  const url = new URL(PAGESPEED_API_BASE_URL);
  url.searchParams.append("url", encodeURI(requestUrl));
  for (const category of PAGESPEED_CATEGORIES) {
    url.searchParams.append("category", category);
  }
  url.searchParams.append("key", apiKey);
  url.searchParams.append("strategy", strategyToFormFactor(strategy));

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    return { error: errorText };
  }
  return response.json();
}
