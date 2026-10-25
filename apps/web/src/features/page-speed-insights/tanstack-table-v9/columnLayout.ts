/** Columns the layout menu does not offer to show, hide, or reorder. */
const FIXED_COLUMN_IDS = new Set(["expander"]);

export function isLayoutColumn(column: { id: string }): boolean {
  return !FIXED_COLUMN_IDS.has(column.id);
}

export function columnLayoutLabel(column: { id: string; columnDef: { header?: unknown } }): string {
  return typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
}

export function moveId(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/** Keep fixed columns in place and apply a new order to the movable ones. */
export function applyMovableOrder(allIds: string[], nextMovableIds: string[]): string[] {
  let movableIndex = 0;
  return allIds.map((id) =>
    FIXED_COLUMN_IDS.has(id) ? id : (nextMovableIds[movableIndex++] ?? id),
  );
}
