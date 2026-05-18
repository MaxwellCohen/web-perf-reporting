import { queryCruxCurrentRecord, type CruxFormFactor } from "@/lib/crux/googleCruxApi";

export { getHistoricalCruxData } from "@/lib/historicalCruxData.services";

export type formFactor = CruxFormFactor;

const CRUX_REVALIDATE_SECONDS = 86_400;

export const getCurrentCruxData = async ({
  url,
  origin,
  formFactor,
}: {
  url?: string;
  origin?: string;
  formFactor: formFactor;
}) => {
  return queryCruxCurrentRecord({
    url,
    origin,
    formFactor,
    revalidateSeconds: CRUX_REVALIDATE_SECONDS,
  });
};
