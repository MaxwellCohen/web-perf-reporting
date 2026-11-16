/**
 * Lighthouse table cells are often objects (`{ type: "numeric", value }`, source locations,
 * DOM nodes...). These helpers reduce a cell to what the user sees, so sorting and filtering
 * work on that instead of on "[object Object]".
 */

const str = (value: unknown): string => (value == null ? "" : String(value));

/** The text a user would search for in a cell. */
export function itemValueText(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(itemValueText).join(" ");

  const v = value as Record<string, unknown>;
  switch (v.type) {
    case "source-location":
      return `${str(v.url)}:${str(v.line)}:${str(v.column)}`;
    case "link":
      return [v.text, v.url].filter(Boolean).map(str).join(" ");
    default:
      // Nodes do not always carry `type: "node"`, so fall through to their visible fields.
      return [v.value ?? v.formattedDefault ?? v.text ?? v.url, v.nodeLabel, v.snippet, v.selector]
        .filter((part) => part != null && part !== "")
        .map(str)
        .join(" ");
  }
}

/** The number in a cell, unwrapping `{ type: "numeric", value }`; `undefined` when it has none. */
export function itemValueNumber(value: unknown): number | undefined {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { value?: unknown }).value
      : value;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

/** Orders two cells: numerically when both hold numbers, otherwise by their visible text. */
export function compareItemValues(a: unknown, b: unknown): number {
  const numA = itemValueNumber(a);
  const numB = itemValueNumber(b);
  if (numA !== undefined && numB !== undefined) return numA - numB;
  return itemValueText(a).localeCompare(itemValueText(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
