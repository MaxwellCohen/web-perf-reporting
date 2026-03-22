'use client';
'use no memo';
import { TreeMapNode } from '@/lib/schema';

export function StatusCircle({ node }: { node: TreeMapNode; }) {
  const { unusedBytes, resourceBytes = 1 } = node;
  if (!unusedBytes) {
    return (
      <div className="size-3 self-center rounded-full bg-gray-500">
        <span className="sr-only">unused JS not reported</span>
      </div>
    );
  }
  const percent = (unusedBytes / resourceBytes) * 100;

  if (percent > 90) {
    return (
      <div className="size-3 self-center rounded-full bg-red-500">
        <span className="sr-only">
          warning this function could have extra JS
        </span>
      </div>
    );
  }
  if (percent > 25) {
    return (
      <div className="size-3 self-center rounded-full bg-yellow-500">
        <span className="sr-only">
          warning this function could have extra JS
        </span>
      </div>
    );
  }
  return (
    <div className="size-3 self-center rounded-full bg-green-500">
      <span className="sr-only">unused Js in a good state </span>
    </div>
  );
}
