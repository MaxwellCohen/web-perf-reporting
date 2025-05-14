import { TableCell, TableRow } from "@/components/ui/tableDiv";

export function NoResultsRow() {
    return (
      <TableRow>
        <TableCell className="flex justify-center items-center align-center h-24 text-center w-full align-middle">No results.</TableCell>
      </TableRow>
    );
  }