"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { CopyHtmlTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyHtmlTableButton";

type CardWithTableProps = {
  title: string;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tableClassName?: string;
};

/**
 * A reusable card component for displaying a simple table with header and body.
 */
export function CardWithTable({
  title,
  header,
  children,
  className,
  contentClassName,
  tableClassName,
}: CardWithTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <CopyHtmlTableButton tableRef={tableRef} />
      </CardHeader>
      <CardContent>
        <div className={contentClassName}>
          <Table ref={tableRef} className={tableClassName}>
            <TableHeader>{header}</TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
