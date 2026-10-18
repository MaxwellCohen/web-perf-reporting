import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";
import { toSearchString } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import ViewerPage from "@/components/viewer/ViewerPage";

export default async function Home({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
} = {}) {
  const initialSearch = toSearchString(await searchParams);

  return (
    <LighthouseViewerAppShell>
      <ViewerPage initialSearch={initialSearch} />
    </LighthouseViewerAppShell>
  );
}
