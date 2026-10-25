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
  const { psi, ...dashboardParams } = params;
  const initialSearch = toSearchString(dashboardParams);
  const initialPsi = firstSearchParam(psi);

  return (
    <LighthouseViewerAppShell>
      <ViewerPage initialSearch={initialSearch} initialPsi={initialPsi} />
    </LighthouseViewerAppShell>
  );
}
