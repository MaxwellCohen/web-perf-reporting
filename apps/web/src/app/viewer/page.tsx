import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";
import { toSearchString } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import ViewerPage from "@/components/viewer/ViewerPage";

function firstSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default async function Home({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
  const params = await searchParams;
  const { psi, psi2, psiLabel, psi2Label, ...dashboardParams } = params;
  const initialSearch = toSearchString(dashboardParams);
  const initialPsi = firstSearchParam(psi);
  const initialPsi2 = firstSearchParam(psi2);
  const initialPsiLabel = firstSearchParam(psiLabel);
  const initialPsi2Label = firstSearchParam(psi2Label);

  return (
    <LighthouseViewerAppShell>
      <ViewerPage
        initialSearch={initialSearch}
        initialPsi={initialPsi}
        initialPsi2={initialPsi2}
        initialPsiLabel={initialPsiLabel}
        initialPsi2Label={initialPsi2Label}
      />
    </LighthouseViewerAppShell>
  );
}
