
/** Minimal TableCard stub for PSI feature tests. */
export function TableCard({
  title,
  table: _table,
}: {
  title: string;
  table?: unknown;
}) {
  return (
    <div data-testid="table-card">
      <span data-testid="card-title">{title}</span>
    </div>
  );
}
