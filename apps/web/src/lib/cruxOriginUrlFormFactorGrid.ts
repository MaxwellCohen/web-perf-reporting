import type { formFactor } from "@/lib/services";

/** Matches {@link getCurrentCruxData} (formFactor key always passed; value may be undefined). */
type CruxFetchOpts = {
  url?: string;
  origin?: string;
  formFactor: formFactor;
};

const ORIGIN_URL_FORM_FACTORS: formFactor[] = [
  undefined,
  "DESKTOP",
  "TABLET",
  "PHONE",
];

/** Eight CrUX calls: origin × form factors, then same url × form factors (same order as prior dashboards). */
export function fetchCruxOriginUrlFormFactorGrid<T>(
  pageUrl: string,
  fetchCrux: (opts: CruxFetchOpts) => Promise<T>,
): Promise<T[]> {
  return Promise.all(
    ORIGIN_URL_FORM_FACTORS.flatMap((formFactor) => [
      fetchCrux({ origin: pageUrl, formFactor }),
      fetchCrux({ url: pageUrl, formFactor }),
    ]),
  );
}
