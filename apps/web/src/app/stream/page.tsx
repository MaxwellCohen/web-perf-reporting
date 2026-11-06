import type { Metadata } from "next";
import { LighthouseViewerAppShell } from "@/components/lh/LighthouseViewerAppShell";
import StreamTimingPage from "@/components/stream-timing/StreamTimingPage";

export const metadata: Metadata = {
  title: "Streaming timing",
  description: "See when each chunk of a streamed HTML response arrives and where the server is waiting.",
};

export default function Page() {
  return (
    <LighthouseViewerAppShell>
      <StreamTimingPage />
    </LighthouseViewerAppShell>
  );
}
