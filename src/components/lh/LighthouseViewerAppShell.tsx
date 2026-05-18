import type { ReactNode } from "react";

export function LighthouseViewerAppShell({ children }: { children: ReactNode }) {
  return <div className="max-w-screen-2xl mx-auto">{children}</div>;
}
