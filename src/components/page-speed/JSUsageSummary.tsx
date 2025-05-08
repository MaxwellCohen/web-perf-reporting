"use client"
import {
    TreeMapData,
    TreeMapNode,
  } from '@/lib/schema';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
  import { Card, CardHeader } from '../ui/card';
  import {
    RenderBytesValue,
  } from './lh-categories/table/RenderTableValue';
  import { Fragment, useContext, useState } from 'react';
  import { InsightsContext } from './PageSpeedContext';
  import { ColumnDef } from "@tanstack/react-table"


type JSSummaryData = {
    name: string;
    resourceBytes: number;
    unusedBytes: number;
    percent: number;
    children: TreeMapNode[];
  };



export const columns: ColumnDef<JSSummaryData[]>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Resource Size",
    },
    {
      accessorKey: "amount",
      
      header: "Unused Bytes",
    },
  ]

//   <TableHead> Resource Size</TableHead>
//   <TableHead> Unused Bytes</TableHead>
//   <TableHead> % of Unused Bytes</TableHead>

export function JSUsageSummary() {
    const items = useContext(InsightsContext);
    const treeData = items
      .map(({ item, label }) => ({
        treeData: item.lighthouseResult?.audits?.['script-treemap-data']
          ?.details as TreeMapData,
        label,
      }))
      .filter(({ treeData }) => treeData?.type === 'treemap-data');
    console.log('hi', treeData);
    if (treeData.length === 0) return null;
  
    return (
      <>
        {treeData.map(({ treeData, label }, idx) => {
          return (
            <Card className="sm:col-span-2 lg:col-span-full" key={`${idx}_label`}>
              <CardHeader className="text-center text-2xl font-bold">
                {label ? `JS Usage Summary for ${label}` : `JS Usage Summary`}
              </CardHeader>
              <Table className="border-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[18rem] max-w-[75vw] whitespace-nowrap">
                      Name
                    </TableHead>
                    <TableHead> Resource Size</TableHead>
                    <TableHead> Unused Bytes</TableHead>
                    <TableHead> % of Unused Bytes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treeData.nodes.map((node, idx) => (
                    <JSUsageTable
                      key={`${idx}-${node.name}`}
                      node={node}
                      depth={0}
                    />
                  ))}
                </TableBody>
              </Table>
            </Card>
          );
        })}
      </>
    );
  }
  function JSUsageTable({
    node,
    depth = 0,
  }: {
    node: TreeMapNode;
    depth: number;
  }) {
    const [open, setOpen] = useState(true);
    const handleClick = () => {
      setOpen(!open);
    };
    const unusedBytes = node.unusedBytes || 0;
    const resourceBytes = node.resourceBytes || 0;
    const percent = (unusedBytes / resourceBytes) * 100;
    const isLarge = unusedBytes > 51200;
    return (
      <Fragment>
        <TableRow onClick={handleClick} suppressHydrationWarning>
          <TableCell
            className={`min-w-[12rem] max-w-[75vw] overflow-scroll whitespace-nowrap ${depth ? 'border-b border-l' : ''}`}
            style={{ width: `calc(75vw - ${0.5 * depth}rem) ` }}
          >
            <div className="flex flex-row align-middle">
              {isLarge || percent > 50 ? <WarningSquare /> : null}
              <div>
                {`${node.name}${node.duplicatedNormalizedModuleName ? ` - ${node.duplicatedNormalizedModuleName}` : ''}`}
              </div>
            </div>
          </TableCell>
          <TableCell className="w-20 border">
            {RenderBytesValue({
              value: resourceBytes || 0,
            })}
          </TableCell>
          <TableCell className="w-20 border">
            {RenderBytesValue({
              value: unusedBytes || 0,
            })}
          </TableCell>
          <TableCell className={`w-20 ${depth ? 'border' : ''}`}>
            {`${percent.toFixed(2)} %`}
          </TableCell>
        </TableRow>
        {node.children && open ? (
          <TableCell
            className="border-x border-b-2 py-0 pr-0"
            colSpan={4}
            suppressHydrationWarning
          >
            <Table className="pr-0 pt-0" suppressHydrationWarning>
              {node.children.map((child, idx) => (
                <JSUsageTable
                  key={`${idx}-${child.name}`}
                  node={child}
                  depth={depth + 1}
                />
              ))}
            </Table>
          </TableCell>
        ) : null}
      </Fragment>
    );
  }
  
  function WarningSquare() {
    return (
      <div className={'rounded-ful mr-2 h-3 w-3 self-center bg-yellow-500'}>
        <span className="sr-only">warning this function could have extra JS</span>
      </div>
    );
  }
  