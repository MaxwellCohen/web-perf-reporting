import { AuditResult } from '@/lib/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ReactMarkdown from 'react-markdown';

export function AuditTable({ audits }: { audits?: AuditResult }) {
  if (!audits) {
    return null;
  }
  return (
    <>
      <div className="text-lg font-bold"> Audits </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Title </TableHead>
            <TableHead>Description </TableHead>
            {/* <TableHead>Details </TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(audits).map(([key, audit], i) => {
            return (
              <TableRow key={`${i}-${audit.id}`}>
                <TableCell rowSpan={1}> {key} </TableCell>
                <TableCell rowSpan={1}> {audit.id} </TableCell>
                <TableCell rowSpan={1}> {audit.title} </TableCell>
                <TableCell rowSpan={1}>
                  <ReactMarkdown>{audit.description || ''}</ReactMarkdown>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
} 