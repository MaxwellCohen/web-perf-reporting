'use client';
import { TreeMapData } from '@/lib/schema';
import { useContext, useMemo } from 'react';
import { InsightsContext } from '../PageSpeedContext';
import { flattenTreeMapNode } from '../flattenTreeMapNode';
import { Card, CardHeader } from '../../ui/card';
import { JSUsageTableWithControls } from './JSUsageTable';
import { ClientOnly } from './ClientOnly';

export function JSUsageSection() {
  const items = useContext(InsightsContext);
  const treeDataArr = useMemo(
    () =>
      items
        .map(({ item, label }) => ({
          treeData: item.lighthouseResult?.audits?.['script-treemap-data']
            ?.details as TreeMapData,
          label,
        }))
        .filter(({ treeData }) => treeData?.type === 'treemap-data'),
    [items],
  );
  if (treeDataArr.length === 0) return null;
  return (
    <>
      {treeDataArr.map(({ treeData, label }, idx) => (
        <JSUsageCard key={`${idx}_label`} treeData={treeData} label={label} />
      ))}
    </>
  );
}

export function JSUsageCard({
  treeData,
  label,
}: {
  treeData: TreeMapData;
  label?: string;
}) {
  const nodes = useMemo(() => {
    const nodes = treeData.nodes;
    return nodes.map(flattenTreeMapNode);
  }, [treeData]);

  return (
    <Card className="col-span-1 w-full lg:col-span-full">
      <CardHeader className="text-center text-2xl font-bold">
        {`JS Usage Table`}
        {label ? ` for ${label}` : ` `}
      </CardHeader>
      <ClientOnly>
        <JSUsageTableWithControls data={nodes} />
      </ClientOnly>
    </Card>
  );
}


