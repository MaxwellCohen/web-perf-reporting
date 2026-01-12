/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';
import { NodeComponent } from '@/components/page-speed/lh-categories/table/RenderNode';
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
const URL_PREFIXES = ['http://', 'https://', 'data:'];

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
    return (null);
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object' && 'type' in value) {
    // Log device validation for node types
    if (value.type === 'node' && process.env.NODE_ENV === 'development') {
      console.debug('[RenderTableValue] Passing device to NodeComponent:', {
        device,
        deviceType: typeof device,
        hasDevice: !!device,
        valueType: value.type,
        lhId: (value as NodeValue).lhId,
      });
    }
    
    // The value's type overrides the heading's for this column.
    const valueTypeMap = {
      code: () => <RenderCodeValue value={value as CodeValue} {...props} />,
      link: () => <RenderLinkValue value={value as LinkValue} {...props} />,
      node: () => (
        <NodeComponent item={value as NodeValue} device={device} {...props} />
      ),
      numeric: () => (
        <RenderNumericValue
          value={value as NumericValue}
          heading={heading}
          {...props}
        />
      ),
      'source-location': () => (
        <RenderSourceLocation value={value as SourceLocationValue} {...props} />
      ),
      url: () => <RenderUrlValue value={value as UrlValue} {...props} />,
      text: () => <RenderTextValue value={value as TextValue} {...props} />,
    } as const;
    return (
      valueTypeMap[value?.type as keyof typeof valueTypeMap]?.() || (
        <RenderDefault value={value} {...props} />
      )
    );
  }

  // Next, deal with primitives.
  const valueTypeMap = {
    bytes: () => <RenderBytesValue value={value} {...props} />,
    code: () => <RenderCode value={value} {...props} />,
    ms: () => <RenderMSValue value={value} {...props} />,
    numeric: () => (
      <RenderNumberValue value={value} heading={heading} {...props} />
    ),
    text: () => <RenderText value={value} {...props} />,
    thumbnail: () => <RenderThumbnail value={value} {...props} />,
    timespanMs: () => <RenderTimespanMs value={value} {...props} />,
    url: () => <RenderUrl value={value} {...props} />,
  } as const;

  return (
    valueTypeMap[heading?.valueType as keyof typeof valueTypeMap]?.() || (
      <RenderDefault value={value} {...props} />
    )
  );
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

function RenderSourceLocation({
  value,
  ...props
}: { value: SourceLocationValue } & React.HTMLAttributes<HTMLElement>) {
  if (!value.url) {
    return <span {...props}></span>;
  }

  // Lines are shown as one-indexed
  const generatedLocation = `${value.url}:${value.line + 1}:${value.column}`;

  let sourceMappedOriginalLocation: string | undefined;
  if (value.original) {
    const file = value.original.file || '<unmapped>';
    sourceMappedOriginalLocation = `${file}:${value.original.line + 1}:${value.original.column}`;
  }

  // Helper function to render a link
  const renderLink = (linkUrl: string, text: string, title?: string) => (
    <a
      href={linkUrl}
      rel="noopener"
      target="_blank"
      {...props}
      className={cn(
        'break-all text-blue-600 underline hover:text-blue-800',
        props.className,
      )}
      title={title}
    >
      {text}
    </a>
  );

  // Helper function to render text
  const renderText = (content: string, title?: string) => (
    <span className="break-all" title={title}>
      {content}
    </span>
  );

  // Helper function to render a text URL
  const renderTextURL = (textUrl: string) => {
    let displayedPath;
    let displayedHost;

    try {
      const url = new URL(textUrl);
      displayedPath = url.pathname === '/' ? url.origin : url.pathname;
      displayedHost =
        url.pathname === '/' || url.hostname === '' ? '' : `(${url.hostname})`;
    } catch {
      displayedPath = textUrl;
      displayedHost = '';
    }

    return (
      <span className="flex flex-wrap items-center">
        {renderLink(textUrl, displayedPath)}
        {displayedHost && (
          <span className="ml-1 text-gray-600">{displayedHost}</span>
        )}
      </span>
    );
  };

  let content;

  if (value.urlProvider === 'network' && sourceMappedOriginalLocation) {
    content = renderLink(
      value.url,
      sourceMappedOriginalLocation,
      `maps to generated location ${generatedLocation}`,
    );
  } else if (value.urlProvider === 'network' && !sourceMappedOriginalLocation) {
    content = (
      <span className="flex flex-wrap items-center">
        {renderTextURL(value.url)}
        <span className="ml-0">
          :{value.line + 1}:{value.column}
        </span>
      </span>
    );
  } else if (value.urlProvider === 'comment' && sourceMappedOriginalLocation) {
    content = renderText(
      `${sourceMappedOriginalLocation} (from source map)`,
      `${generatedLocation} (from sourceURL)`,
    );
  } else if (value.urlProvider === 'comment' && !sourceMappedOriginalLocation) {
    content = renderText(`${generatedLocation} (from sourceURL)`);
  } else {
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
  const bytes = Math.floor(Number(value));
  const kb = bytes / 1024;
  const mb = kb / 1024;
  return (
    <span title="bytes" {...props} className={cn('', props.className)}>
      {children}
      {mb > 1
        ? `${mb.toFixed(2)} MB`
        : kb > 1
          ? `${kb.toFixed(2)} KB`
          : `${bytes} bytes`}
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
  const ms = Number(msU)
  // Normalize values very close to zero to avoid "-0 ms" display
  const normalizedMs = Math.abs(ms) < 0.001 ? 0 : ms;
  if (Number.isNaN(normalizedMs) || normalizedMs <= 0 ) {
    return "0 ms";
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
    return `${parts.join(" ")}`;
  }

  if (milliseconds > 0 || parts.length === 0) {
    parts.push(`${milliseconds} ms`);
  }

  // Join parts with commas and "and" for the last separator

    return `${parts.join(" ")}`;

}

export function RenderMSValue({ value, ...props }: { value: unknown }& React.HTMLAttributes<HTMLElement>) {
  const ms = Number(value);
  if(Number.isNaN(ms)) {
    return <span title="ms" {...props} className={cn('', props.className)}>N/A</span>;
  }
  // Normalize values very close to zero to avoid "-0 ms" display
  const normalizedMs = Math.abs(ms) < 0.001 ? 0 : ms;
  if (normalizedMs < 1000) {
    // Use Math.abs to ensure we never display "-0"
    const displayMs = Math.abs(normalizedMs) < 0.5 ? 0 : normalizedMs;
    return <span title="ms" {...props} className={cn('', props.className)}>{displayMs.toFixed(0)} ms</span>;
  }
  const seconds = normalizedMs / 1000;
  if (seconds < 60) {
    return <span title="ms" {...props} className={cn('', props.className)}>{seconds.toFixed(2)} s</span>;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return <span title="ms" {...props} className={cn('', props.className)}>{minutes.toFixed(2)} min</span>;
  }
  const hours = minutes / 60;
  return <span title="ms" {...props} className={cn('', props.className)}>{hours.toFixed(2)} h</span>;
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
      {(+(value as number)   || 0).toFixed(-Math.log10(heading?.granularity || 1))}
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