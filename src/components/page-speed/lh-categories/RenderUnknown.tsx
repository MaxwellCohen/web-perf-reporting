import { AuditResult } from "@/lib/schema";

export function RenderUnknown({
    details,
  }: {
    details: AuditResult[string]['details'];
  }) {
    return (
      <div className="overflow-x-auto">
        We don&apos;t know how to render audit details of type{' '}
        {details?.type || ' unknown '}
        The Lighthouse version that collected this data is likely newer than the
        Lighthouse version of the report renderer. Expand for the raw JSON.
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
    );
  }
  