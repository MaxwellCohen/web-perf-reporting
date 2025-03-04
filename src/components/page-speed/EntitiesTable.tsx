import { useId } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Entities } from '@/lib/schema';

export function EntitiesTable({ entities }: { entities?: Entities }) {
  const id = useId();
  if (!entities?.length) {
    return null;
  }

  return (
    <>
      <div id={`${id}-entities-title`}>
        Entities - list of Origins that the site uses
      </div>
      <Table aria-labelledby={`${id}-entities-title`}>
        <TableHeader>
          <TableRow>
            <TableHead>Name </TableHead>
            <TableHead>Is First Party </TableHead>
            <TableHead>Is Unrecognized </TableHead>
            <TableHead>Origins </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity, i) => (
            <TableRow key={`${i}-${entity.name}`}>
              <TableCell> {entity.name} </TableCell>
              <TableCell>
                {entity.isFirstParty ? '✅ - yes' : '❌ - no'}
              </TableCell>
              <TableCell>
                {entity.isUnrecognized ? '✅ - yes' : '❌ - no'}
              </TableCell>
              <TableCell>
                {entity.origins.map((o, i) => (
                  <div key={`${i}-${o}`}>{o} </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
} 