import ViewerPage from "@/components/viewer/ViewerPage";
import { toSearchString } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { updateURl } from "@/lib/utils";

function firstSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default async function PageSpeedPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
  const params = await searchParams;
  const { psi, psi2, psiLabel, psi2Label, url, ...dashboardParams } = params;
  // `?url=` is the legacy lookup param; treat it as a page URL to measure.
  const initialPsi = firstSearchParam(psi) || updateURl(firstSearchParam(url));

  return (
    <ViewerPage
      initialSearch={toSearchString(dashboardParams)}
      initialPsi={initialPsi}
      initialPsi2={firstSearchParam(psi2)}
      initialPsiLabel={firstSearchParam(psiLabel)}
      initialPsi2Label={firstSearchParam(psi2Label)}
    />
  );
}
