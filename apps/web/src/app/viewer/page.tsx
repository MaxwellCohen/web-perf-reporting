import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";
import ViewerPage from "@/components/viewer/ViewerPage";

export default async function Home() {
  return (
    <LighthouseViewerAppShell>
      <ViewerPage />
    </LighthouseViewerAppShell>
  );
}
