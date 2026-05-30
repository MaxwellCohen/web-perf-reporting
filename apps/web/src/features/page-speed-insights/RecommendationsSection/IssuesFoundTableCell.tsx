import { RenderTableValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { ItemValue, TableColumnHeading, TableItem } from "@/lib/schema";

interface IssuesFoundTableCellProps {
  value: ItemValue | unknown;
  subItems?: TableItem["subItems"];
  heading: TableColumnHeading;
  device: string;
}

export function IssuesFoundTableCell({
  value,
  subItems,
  heading,
  device,
}: IssuesFoundTableCellProps) {
  if (subItems?.items && subItems.items.length > 0) {
    const subKey = heading.subItemsHeading?.key || "url";
    const subHeading: TableColumnHeading | null = heading.subItemsHeading
      ? ({
          ...heading.subItemsHeading,
          key: subKey,
          label: (heading.subItemsHeading as TableColumnHeading).label || subKey,
        } as TableColumnHeading)
      : heading;

    return (
      <div className="space-y-1">
        <div className="font-medium">
          <RenderTableValue value={value as ItemValue} heading={heading} device={device} />
        </div>
        <ul className="list-disc list-inside ml-2 space-y-0.5 text-muted-foreground">
          {subItems.items.map((subItem: TableItem, subIdx: number) => {
            const subValue = subItem[subKey] as ItemValue | undefined;
            return (
              <li key={subIdx} className="text-xs wrap-break-word">
                <RenderTableValue value={subValue} heading={subHeading} device={device} />
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="wrap-break-word">
      <RenderTableValue value={value as ItemValue} heading={heading} device={device} />
    </div>
  );
}
