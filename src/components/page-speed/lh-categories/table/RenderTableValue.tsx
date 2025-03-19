/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';
import { NodeComponent } from './RenderNode';
import {
  CodeValue,
  DeviceType,
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
  device: DeviceType;
} & React.HTMLAttributes<HTMLElement>) {
  if (value === undefined || value === null) {
    return <div className="col-span-1"></div>;
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object' && 'type' in value) {
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
      valueTypeMap[value.type as keyof typeof valueTypeMap]?.() || (
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
        'overflow-hidden break-all px-6 font-mono text-xs',
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
        'block overflow-hidden break-words break-all px-6',
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
  if (heading?.granularity) {
    return (
      <div title="numeric" {...props} className={cn('', props.className)}>
        {value.value.toFixed(-Math.log10(heading.granularity))}
      </div>
    );
  }

  return (
    <div title="numeric" {...props} className={cn('', props.className)}>
      {value.value}
    </div>
  );
}

function RenderSourceLocation({
  value,
  ...props
}: { value: SourceLocationValue } & React.HTMLAttributes<HTMLElement>) {
  if (!value.url) {
    return <div {...props}></div>;
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
      <div className="flex flex-wrap items-center">
        {renderLink(textUrl, displayedPath)}
        {displayedHost && (
          <span className="ml-1 text-gray-600">{displayedHost}</span>
        )}
      </div>
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
      <div className="flex flex-wrap items-center">
        {renderTextURL(value.url)}
        <span className="ml-0">
          :{value.line + 1}:{value.column}
        </span>
      </div>
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
    <div
      className="py-1 font-mono text-sm"
      data-source-url={value.url}
      data-source-line={value.line.toString()}
      data-source-column={value.column.toString()}
    >
      {content}
    </div>
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
        'block overflow-hidden break-words break-all px-6',
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
    <div title="text" {...props}>
      {value.value}
    </div>
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

function RenderBytesValue({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const bytes = Number(value);
  const kb = bytes / 1024;
  const mb = kb / 1024;
  return (
    <div title="bytes" {...props} className={cn('', props.className)}>
      {mb > 1
        ? `${mb.toFixed(2)} MB`
        : kb > 1
          ? `${kb.toFixed(2)} KB`
          : `${bytes} bytes`}
    </div>
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
        'overflow-hidden break-all px-6 font-mono text-xs',
        props.className,
      )}
    >
      {strValue}
    </code>
  );
}

export function renderTimeValue(value: number) {
  const ms = value % 1000;
  if (value < 1000) {
    return `${value.toFixed(0)} ms`;
  }
  const seconds = value / 1000;
  if (seconds < 60) {
    return `${Math.floor(seconds)}S ${ms.toFixed(0)} s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(2)} min`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
  return `${hours.toFixed(2)} h`;
  }
  const days = hours / 24;
  return `${days.toFixed(2)} d`;  
}

function RenderMSValue({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const time = renderTimeValue(Number(value));

  return (
    <div title="ms" {...props} className={cn('', props.className)}>
      {time} h
    </div>
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
  if (heading?.granularity && value) {
    return (
      <div
        title="numeric"
        {...props}
        className={cn('align-right', props.className)}
      >
        {(value as number).toFixed(-Math.log10(heading.granularity || 1))}
      </div>
    );
  }

  return (
    <div
      title="numeric"
      {...props}
      className={cn('align-right', props.className)}
    >
      {(value as number).toFixed(-Math.log10(heading?.granularity || 1))}
    </div>
  );
}

function RenderText({
  value,
  ...props
}: { value: unknown } & React.HTMLAttributes<HTMLElement>) {
  const strValue = String(value);
  if (strValue.length < 10) {
    return (
      <div title="text" {...props} className={cn('', props.className)}>
        {strValue}
      </div>
    );
  }
  return (
    <div title="text" {...props}>
      {strValue}
    </div>
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
          'block overflow-hidden break-words break-all px-6',
          props.className,
        )}
      >
        {strValue}
      </a>
    );
  } else {
    // Fall back to <pre> rendering if not actually a URL.
    return (
      <div
        title="url"
        {...props}
        className={cn(
          'block overflow-hidden break-words break-all px-6',
          props.className,
        )}
      >
        {strValue}
      </div>
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
