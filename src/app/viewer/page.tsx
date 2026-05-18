import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";
import ViewerPage from "@/components/viewer/ViewerPage";

export default async function Home(params: unknown) {
  console.log(params);
  return (
    <LighthouseViewerAppShell>
      <ViewerPage />
    </LighthouseViewerAppShell>
  );
}
