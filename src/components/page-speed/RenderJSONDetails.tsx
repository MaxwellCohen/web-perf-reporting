/* eslint-disable @typescript-eslint/no-explicit-any */

export function RenderJSONDetails({ data, data2, title = 'All Data' }: { data: any, data2?: any, title?: string }) {
  return (
    <details>
      <summary>{title}</summary>
      <div className="grid md:grid-cols-2">
        <pre className="border-r-2 border-gray-300 overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
        {data2 && <pre className="overflow-x-auto">{JSON.stringify(data2, null, 2)}</pre>}
      </div>
    </details>
  );
} 