/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';
import { NodeComponent } from '@/features/page-speed-insights/lh-categories/table/RenderNode';
import {
  CodeValue,
  ItemValue,
  LinkValue,
  NodeValue,
  NumericValue,
  SourceLocationValue,
  TableColumnHeading,
  TextValue,
  UrlValue,
} from '@/lib/schema';
import { parseUrlForDisplay } from '@/lib/urlDisplay';
const URL_PREFIXES = ['http://', 'https://', 'data:'];

export function formatBytes(value: unknown): string {
  const bytes = Math.floor(Number(value));
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb > 1) return `${mb.toFixed(2)} MB`;
  if (kb > 1) return `${kb.toFixed(2)} KB`;
  return `${bytes} bytes`;
}

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
  if (typeof value === 'object' && 'type' in value) {
    const type = (value as { type: string }).type;
    switch (type) {
      case 'code':
        return <RenderCodeValue value={value as CodeValue} {...props} />;
      case 'link':
        return <RenderLinkValue value={value as LinkValue} {...props} />;
      case 'node':
        return (
          <NodeComponent item={value as NodeValue} device={device} {...props} />
        );
      case 'numeric':
        return (
          <RenderNumericValue
            value={value as NumericValue}
            heading={heading}
            {...props}
          />
        );
      case 'source-location':
        return (
          <RenderSourceLocation
            value={value as SourceLocationValue}
            {...props}
          />
        );
      case 'url':
        return <RenderUrlValue value={value as UrlValue} {...props} />;
      case 'text':
        return <RenderTextValue value={value as TextValue} {...props} />;
      default:
        return <RenderDefault value={value} {...props} />;
    }
  }

  // Primitive values: use heading's valueType
  switch (heading?.valueType) {
    case 'bytes':
      return <RenderBytesValue value={value} {...props} />;
    case 'code':
      return <RenderCode value={value} {...props} />;
    case 'ms':
      return <RenderMSValue value={value} {...props} />;
    case 'numeric':
      return (
        <RenderNumberValue value={value} heading={heading} {...props} />
      );
    case 'text':
      return <RenderText value={value} {...props} />;
    case 'thumbnail':
      return <RenderThumbnail value={value} {...props} />;
    case 'timespanMs':
      return <RenderTimespanMs value={value} {...props} />;
    case 'url':
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
      className={cn(
        'overflow-hidden break-all font-mono text-xs',
        props.className,
      )}
    >
      {typeof value === 'string' ? value : JSON.stringify(value)}
    </code>
  );
}

function RenderLinkValue({
  value,
  ...props
}: { value: LinkValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <a
      href={value.url}
      title={value.text}
      {...props}
      className={cn(
        'block overflow-auto wrap-break-word break-all',
        props.className,
      )}
    >
      {value.text}
    </a>
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
  if (heading?.granularity && typeof value.value === 'number') {
    return (
      <span title="numeric" {...props} className={cn('', props.className)}>
        {(value.value || 0).toFixed(-Math.log10(heading.granularity))}
      </span>
    );
  }

  return (
    <span title="numeric" {...props} className={cn('', props.className)}>
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
      className={cn(
        'break-all text-blue-600 underline hover:text-blue-800',
        props.className,
      )}
      title={title}
    >
      {children}
    </a>
  );
}

function SourceLocationUrlDisplay({ url }: { url: string }) {
  const parsed = parseUrlForDisplay(url);
  const path = parsed?.path ?? url;
  const hostLabel = parsed?.hostLabel ?? '';

  return (
    <span className="flex flex-wrap items-center">
      <SourceLocationLink href={url} title={url}>
        {path}
      </SourceLocationLink>
      {hostLabel ? (
        <span className="ml-1 text-gray-600">{hostLabel}</span>
      ) : null}
    </span>
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
  urlProvider: 'network' | 'comment';
  url: string;
  line: number;
  column: number;
  orig: string | undefined;
  gen: string;
} & React.HTMLAttributes<HTMLElement>) {
  if (urlProvider === 'network') {
    return orig ? (
      <SourceLocationLink
        href={url}
        title={`maps to generated location ${gen}`}
        {...props}
      >
        {orig}
      </SourceLocationLink>
    ) : (
      <span className="flex flex-wrap items-center">
        <SourceLocationUrlDisplay url={url} />
        <span className="ml-0">
          :{line + 1}:{column}
        </span>
      </span>
    );
  }

  if (urlProvider === 'comment') {
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
    ? `${value.original.file || '<unmapped>'}:${value.original.line + 1}:${value.original.column}`
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

function RenderUrlValue({
  value,
  ...props
}: { value: UrlValue } & React.HTMLAttributes<HTMLElement>) {
  return (
    <a
      href={value.value}
      title={value.value}
      {...props}
      className={cn(
        'block overflow-auto wrap-break-word break-all',
        props.className,
      )}
    >
      {value.value}
    </a>
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
    <span title="bytes" {...props} className={cn('', props.className)}>
      {children}
      {formatBytes(value)}
    </span>
  );
}

function RenderCode({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  return (
    <code
      title="code"
      {...props}
      className={cn(
        'overflow-hidden break-all font-mono text-xs',
        props.className,
      )}
    >
      {strValue}
    </code>
  );
}

export function renderTimeValue(msU: unknown) {
  const ms = Number(msU);
  // Normalize values very close to zero to avoid "-0 ms" display
  const normalizedMs = Math.abs(ms) < 0.001 ? 0 : ms;
  if (Number.isNaN(normalizedMs) || normalizedMs <= 0) {
    return '0 ms';
  }

  const milliseconds = Math.floor(normalizedMs % 1000);
  const seconds = Math.floor((normalizedMs / 1000) % 60);
  const minutes = Math.floor((normalizedMs / (1000 * 60)) % 60);
  const hours = Math.floor((normalizedMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(normalizedMs / (1000 * 60 * 60 * 24));

  const parts = [];

  if (days > 0) {
    parts.push(`${days} d`);
  }

  if (hours > 0) {
    parts.push(`${hours} h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} m`);
  }

  if (seconds > 0) {
    parts.push(`${seconds}.${milliseconds || 0} s`);
    return `${parts.join(' ')}`;
  }

  if (milliseconds > 0 || parts.length === 0) {
    parts.push(`${milliseconds} ms`);
  }

  return `${parts.join(' ')}`;
}

function formatMsValue(value: unknown): string {
  const ms = Number(value);
  if (Number.isNaN(ms)) return 'N/A';
  const normalizedMs = Math.abs(ms) < 0.001 ? 0 : ms;
  if (normalizedMs < 1000) {
    const displayMs = Math.abs(normalizedMs) < 0.5 ? 0 : normalizedMs;
    return `${displayMs.toFixed(0)} ms`;
  }
  const s = normalizedMs / 1000;
  if (s < 60) return `${s.toFixed(2)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(2)} min`;
  return `${(m / 60).toFixed(2)} h`;
}

export function RenderMSValue({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  return (
    <span title="ms" {...props} className={cn('', props.className)}>
      {formatMsValue(value)}
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
  if (heading?.granularity && typeof value === 'number') {
    return (
      <span
        title="numeric"
        {...props}
        className={cn('align-right', props.className)}
      >
        {(+value as number || 0).toFixed(-Math.log10(+heading.granularity || 1))}
      </span>
    );
  }

  return (
    <span
      title="numeric"
      {...props}
      className={cn('align-right', props.className)}
      >
        {(Number(value) || 0).toFixed(-Math.log10(heading?.granularity || 1))}
      </span>
  );
}

function RenderText({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  if (strValue.length < 10) {
    return (
      <span title="text" {...props} className={cn('', props.className)}>
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

function RenderUrl({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  if (URL_PREFIXES.some((prefix) => strValue.startsWith(prefix))) {
    return (
      <a
        href={strValue}
        title={strValue}
        {...props}
        className={cn(
          'block overflow-auto wrap-break-word break-all',
          props.className,
        )}
      >
        {strValue}
      </a>
    );
  } else {
    // Fall back to <pre> rendering if not actually a URL.
    return (
      <span
        title="url"
        {...props}
        className={cn(
          'block overflow-auto wrap-break-word break-all',
          props.className,
        )}
      >
        {strValue}
      </span>
    );
  }
}

function RenderThumbnail({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = `${value}`;
  return <img src={strValue} title={strValue} alt="" {...props} />;
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
    return 'N/A';
  }
  return `${numValue}`;
}