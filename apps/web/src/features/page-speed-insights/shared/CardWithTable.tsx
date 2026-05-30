import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHeader } from "@/components/ui/table";

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
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={contentClassName}>
          <Table className={tableClassName}>
            <TableHeader>{header}</TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
