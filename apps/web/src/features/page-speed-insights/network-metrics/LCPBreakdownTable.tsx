"use client";

import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LCPBreakdownTableRow } from "./lcpBreakdownSelectors";

type Props = {
  tableRows: LCPBreakdownTableRow[];
  reportLabels: string[];
};

export function LCPBreakdownTable({ tableRows, reportLabels }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-40">Subpart</TableHead>
          {reportLabels.map((label) => (
            <TableHead key={label} className="min-w-35">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableRows.map((row) => (
          <TableRow key={row.subpart}>
            <TableCell className="font-medium">{row.label}</TableCell>
            {reportLabels.map((label) => {
              const value = row.valuesByReportLabel[label];
              return (
                <TableCell key={label}>
                  {value !== undefined ? (
                    <RenderMSValue value={value} />
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

