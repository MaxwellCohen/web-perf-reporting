import type { CruxReport } from "@/lib/schema";
import type { CruxReportMap } from "../types";

/** Maps the fixed Promise.all order from CurrentPerformanceSection to keyed reports. */
export function buildCruxReportMap(reports: readonly (CruxReport | null)[]): CruxReportMap {
  const [
    originAll,
    originDESKTOP,
    originTABLET,
    originPHONE,
    urlAll,
    urlDESKTOP,
    urlTABLET,
    urlPHONE,
  ] = reports;
  return {
    originAll,
    originDESKTOP,
    originTABLET,
    originPHONE,
    urlAll,
    urlDESKTOP,
    urlTABLET,
    urlPHONE,
  };
}
