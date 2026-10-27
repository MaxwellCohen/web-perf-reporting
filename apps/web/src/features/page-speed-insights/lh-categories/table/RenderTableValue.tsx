/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { NodeComponent } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import {
  BaselineStatusValue,
  CodeValue,
  ItemValue,
  LinkValue,
  NodeValue,
  NumericValue,
  SourceLocationValue,
  TableColumnHeading,
  TextValue,
  UrlValue,
} from "@/lib/schema";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
const URL_PREFIXES = ["http://", "https://", "data:"];

/**
 * Render a details item value for embedding in a table. Renders the value
 * based on the heading's valueType, unless the value itself has a `type`
 * property to override it.
 * @param {TableItemValue} value
 * @param {LH.Audit.Details.TableColumnHeading} heading
 * @return {Element|null}
 */
export function RenderTableValue({
  value,
  heading,
  device,
  ...props
}: {
  value?: ItemValue;
  heading?: TableColumnHeading | null;
  device: string;
} & React.HTMLAttributes<HTMLElement>) {
  if (value === undefined || value === null) {
    return null;
  }

  // Object values: type overrides heading
  if (typeof value === "object" && "type" in value) {
    const type = (value as { type: string }).type;
    switch (type) {
      case "code":
        return <RenderCodeValue value={value as CodeValue} {...props} />;
      case "link":
        return <RenderLinkValue value={value as LinkValue} {...props} />;
      case "node":
        return <NodeComponent item={value as NodeValue} device={device} {...props} />;
      case "numeric":
        return <RenderNumericValue value={value as NumericValue} heading={heading} {...props} />;
      case "source-location":
        return <RenderSourceLocation value={value as SourceLocationValue} {...props} />;
      case "url":
        return <RenderUrlValue value={value as UrlValue} {...props} />;
      case "text":
        return <RenderTextValue value={value as TextValue} {...props} />;
      case "baseline-status":
        return <RenderBaselineStatus value={value as BaselineStatusValue} {...props} />;
      default:
        return <RenderDefault value={value} {...props} />;
    }
  }

  // Primitive values: use heading's valueType
  switch (heading?.valueType) {
    case "bytes":
      return <RenderBytesValue value={value} {...props} />;
    case "code":
      return <RenderCode value={value} {...props} />;
    case "ms":
      return <RenderMSValue value={value} {...props} />;
    case "numeric":
      return <RenderNumberValue value={value} heading={heading} {...props} />;
    case "text":
      return <RenderText value={value} {...props} />;
    case "thumbnail":
      return <RenderThumbnail value={value} {...props} />;
    case "timespanMs":
      return <RenderTimespanMs value={value} {...props} />;
    case "url":
      return <RenderUrl value={value} {...props} />;
    default:
      return <RenderDefault value={value} {...props} />;
  }
}

function RenderCodeValue({
  value,
  ...props
}: { value: CodeValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      title="code"
      {...props}
      className={cn("overflow-hidden break-all font-mono text-xs", props.className)}
    >
      {typeof value === "string" ? value : JSON.stringify(value)}
    </code>
  );
}

function RenderAnchoredOverflowLink({
  href,
  title: linkTitle,
  label,
  ...props
}: {
  href: string;
  title: string;
  label: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <a
      href={href}
      title={linkTitle}
      {...props}
      className={cn("block overflow-auto wrap-break-word break-all", props.className)}
    >
      {label}
    </a>
  );
}

function RenderLinkValue({
  value,
  ...props
}: { value: LinkValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <RenderAnchoredOverflowLink href={value.url} title={value.text} label={value.text} {...props} />
  );
}

function RenderNumericValue({
  value,
  heading,
  ...props
}: {
  value: NumericValue;
  heading?: TableColumnHeading | null;
} & React.HTMLAttributes<HTMLElement>) {
  if (heading?.granularity && typeof value.value === "number") {
    return (
      <span title="numeric" {...props} className={cn("", props.className)}>
        {(value.value || 0).toFixed(-Math.log10(heading.granularity))}
      </span>
    );
  }

  return (
    <span title="numeric" {...props} className={cn("", props.className)}>
      {value.value}
    </span>
  );
}

function SourceLocationLink({
  href,
  title,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      rel="noopener"
      target="_blank"
      {...props}
      className={cn("break-all text-sky-400 underline hover:text-sky-300", props.className)}
      title={title}
    >
      {children}
    </a>
  );
}

function SourceLocationContent({
  urlProvider,
  url,
  line,
  column,
  orig,
  gen,
  ...props
}: {
  urlProvider: "network" | "comment";
  url: string;
  line: number;
  column: number;
  orig: string | undefined;
  gen: string;
} & React.HTMLAttributes<HTMLElement>) {
  if (urlProvider === "network") {
    return orig ? (
      <SourceLocationLink href={url} title={`maps to generated location ${gen}`} {...props}>
        {orig}
      </SourceLocationLink>
    ) : (
      <span className="flex flex-wrap items-center">
        <ResourceUrlCell url={url} className="font-mono text-sm" />
        <span className="ml-0">
          :{line + 1}:{column}
        </span>
      </span>
    );
  }

  if (urlProvider === "comment") {
    return orig ? (
      <span className="break-all" title={`${gen} (from sourceURL)`}>
        {orig} (from source map)
      </span>
    ) : (
      <span className="break-all" title={gen}>
        {gen} (from sourceURL)
      </span>
    );
  }

  return null;
}

function RenderSourceLocation({
  value,
  ...props
}: { value: SourceLocationValue } & React.HTMLAttributes<HTMLElement>) {
  if (!value.url) {
    return <span {...props} />;
  }

  const gen = `${value.url}:${value.line + 1}:${value.column}`;
  const orig = value.original
    ? `${value.original.file || "<unmapped>"}:${value.original.line + 1}:${value.original.column}`
    : undefined;

  const content = (
    <SourceLocationContent
      urlProvider={value.urlProvider}
      url={value.url}
      line={value.line}
      column={value.column}
      orig={orig}
      gen={gen}
      {...props}
    />
  );

  if (content === null) {
    return null;
  }

  return (
    <span
      className="py-1 font-mono text-sm"
      data-source-url={value.url}
      data-source-line={value.line.toString()}
      data-source-column={value.column.toString()}
    >
      {content}
    </span>
  );
}

function renderHttpUrl(
  url: string,
  props: React.HTMLAttributes<HTMLElement>,
): React.JSX.Element {
  return (
    <div {...props} className={cn("min-w-0", props.className)}>
      <ResourceUrlCell url={url} />
    </div>
  );
}

function isHttpOrDataUrl(value: string): boolean {
  return URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function RenderUrlValue({
  value,
  ...props
}: { value: UrlValue } & React.HTMLAttributes<HTMLElement>) {
  const v = value.value;
  if (isHttpOrDataUrl(v)) {
    return renderHttpUrl(v, props);
  }
  return <RenderAnchoredOverflowLink href={v} title={v} label={v} {...props} />;
}

const BASELINE_STATUS_COLOR: Record<string, string> = {
  limited: "hsl(var(--chart-3))",
  low: "hsl(var(--chart-2))",
  high: "hsl(var(--chart-1))",
};

function baselineStatusLabel(value: BaselineStatusValue): string {
  if (typeof value.displayString === "string") return value.displayString;
  return value.displayString.formattedDefault;
}

function RenderBaselineStatus({
  value,
  ...props
}: { value: BaselineStatusValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <span
      title="baseline-status"
      {...props}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", props.className)}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: BASELINE_STATUS_COLOR[value.status] ?? "hsl(var(--muted-foreground))" }}
        aria-hidden
      />
      {baselineStatusLabel(value)}
    </span>
  );
}

function RenderTextValue({
  value,
  ...props
}: { value: TextValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <span title="text" {...props}>
      {value.value}
    </span>
  );
}

function RenderDefault({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  return (
    <pre title="default" {...props}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function RenderBytesValue({
  value,
  children,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  return (
    <span title="bytes" {...props} className={cn("whitespace-nowrap tabular-nums", props.className)}>
      {children}
      {formatBytes(Number(value))}
    </span>
  );
}

function RenderCode({ value, ...props }: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  return (
    <code
      title="code"
      {...props}
      className={cn("overflow-hidden break-all font-mono text-xs", props.className)}
    >
      {strValue}
    </code>
  );
}

export function RenderMSValue({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  return (
    <span title="ms" {...props} className={cn("whitespace-nowrap tabular-nums", props.className)}>
      {formatMs(Number(value))}
    </span>
  );
}

function RenderNumberValue({
  value,
  heading,
  ...props
}: {
  value: unknown;
  heading?: TableColumnHeading | null;
} & React.HTMLAttributes<HTMLElement>) {
  if (heading?.granularity && typeof value === "number") {
    return (
      <span title="numeric" {...props} className={cn("align-right", props.className)}>
        {((+value as number) || 0).toFixed(-Math.log10(+heading.granularity || 1))}
      </span>
    );
  }

  return (
    <span title="numeric" {...props} className={cn("align-right", props.className)}>
      {(Number(value) || 0).toFixed(-Math.log10(heading?.granularity || 1))}
    </span>
  );
}

function RenderText({ value, ...props }: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  if (strValue.length < 10) {
    return (
      <span title="text" {...props} className={cn("", props.className)}>
        {strValue}
      </span>
    );
  }
  return (
    <span title="text" {...props}>
      {strValue}
    </span>
  );
}

function RenderUrl({ value, ...props }: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  if (isHttpOrDataUrl(strValue)) {
    return renderHttpUrl(strValue, props);
  }
  return (
    <span
      title="url"
      {...props}
      className={cn("block overflow-auto wrap-break-word break-all", props.className)}
    >
      {strValue}
    </span>
  );
}

function RenderThumbnail({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = `${value}`;
  return <img src={strValue} title={strValue} alt="" loading="lazy" decoding="async" {...props} />;
}

function RenderTimespanMs({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const numValue = Number(value);
  return <RenderMSValue value={numValue} {...props} />;
}

export function RenderCountNumber(v: unknown) {
  const numValue = Number(v);
  if (Number.isNaN(numValue)) {
    return "N/A";
  }
  return `${numValue}`;
}
