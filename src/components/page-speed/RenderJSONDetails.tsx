/* eslint-disable @typescript-eslint/no-explicit-any */

export function RenderJSONDetails({ data }: { data: any }) {
  return (
    <details>
      <summary>All Data</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
} 