"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function toSentenceCase(str: string) {
  if (!str) {
    return "";
  }
  const result = str.split("_").join(" ").toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function PercentTable({
  title,
  data,
  className,
  dateRange,
}: {
  title: string;
  data: Record<string, number>;
  className?: string;
  dateRange?: string;
}) {
  const entries = Object.entries(data);
  return (
    <Card className={cn("flex-1", className)}>
      <div className="text-md text-center font-bold">{title}</div>
      {dateRange && (
        <div className="text-xs text-center text-muted-foreground mb-1">{dateRange}</div>
      )}
      <Table>
        <TableHeader className="pt-2">
          <TableRow>
            {entries.map(([label]) => (
              <TableHead key={label} className="h-4">
                {toSentenceCase(label)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {entries.map(([label, value]) => {
              return (
                <TableCell key={label} className="h-4">
                  {" "}
                  {(value * 100).toFixed(2)} %{" "}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
