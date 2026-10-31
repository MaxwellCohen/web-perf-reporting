import type { ReactNode } from "react";

const LEGAL_LAST_UPDATED = "October 29, 2026";
export const PRIVACY_ISSUES_URL =
  "https://github.com/MaxwellCohen/web-perf-reporting/issues/new?title=Privacy%20request&labels=privacy";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 space-y-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>
      {children}
    </article>
  );
}
