import { AuditResultsRecord } from "@/lib/schema";

export function RenderUnknown({
    details,
  }: {
    details:( AuditResultsRecord[string]['details'] | null)[];
  }) {
    return (
      <div className="overflow-x-auto">
        We don&apos;t know how to render audit details of type{' '}
        {details?.[0]?.type || ' unknown '}
        The Lighthouse version that collected this data is likely newer than the
        Lighthouse version of the report renderer. Expand for the raw JSON.
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </div>
    );
  }
  