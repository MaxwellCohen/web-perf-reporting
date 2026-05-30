import { LhInputForm } from "@/components/lh/LhInputForm";
import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";

export default async function Home() {
  return (
    <LighthouseViewerAppShell>
      <LhInputForm />
    </LighthouseViewerAppShell>
  );
}
