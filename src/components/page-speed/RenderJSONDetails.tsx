
import { JSX } from 'react';

export function RenderJSONDetails({
  data,
  data2,
  title = 'All Data',
  ...props
}: {
  data: unknown;
  data2?: unknown;
  title?: string;
} & JSX.IntrinsicElements['details']) {
  return (
    <details {...props}>
      <summary>{title}</summary>
      <div className="grid md:grid-cols-2 text-left">
        <pre className="overflow-x-auto border-r-2 text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
        {data2 ? (
          <pre className="overflow-x-auto">
            {JSON.stringify(data2, null, 2)}
          </pre>
        ): null}
      </div>
    </details>
  );
}
