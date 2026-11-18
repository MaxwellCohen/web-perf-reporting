import type { Metadata } from "next";
import DeliveryCheckPage from "@/components/delivery/DeliveryCheckPage";
import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";

export const metadata: Metadata = {
  title: "Delivery check",
  description:
    "Find ghost errors: responses the server logs as 200 OK but that reach the client incomplete.",
};

export default function Page() {
  return (
    <LighthouseViewerAppShell>
      <DeliveryCheckPage />
    </LighthouseViewerAppShell>
  );
}
