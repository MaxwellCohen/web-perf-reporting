import { LhInputForm } from "@/components/lh/LhInputForm";
import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";

export default async function Home(params: unknown) {
  console.log(params);
  return (
    <LighthouseViewerAppShell>
      <LhInputForm />
    </LighthouseViewerAppShell>
  );
}
