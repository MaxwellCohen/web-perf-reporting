/* eslint-disable @next/next/no-img-element */
import { NodeComponent } from './RenderNode';
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
}: {
  value?: ItemValue;
  heading?: TableColumnHeading | null;
  device: 'Desktop' | 'Mobile';
}) {
  if (value === undefined || value === null) {
    return null;
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object' && 'type' in value) {
    // The value's type overrides the heading's for this column.
    const valueTypeMap = {
      code: () => <RenderCodeValue value={value as CodeValue} />,
      link: () => <RenderLinkValue value={value as LinkValue} />,
      node: () => <NodeComponent item={value as NodeValue} device={device} />,
      numeric: () => <RenderNumericValue value={value as NumericValue} heading={heading} />,
      'source-location': () => <RenderSourceLocation value={value as SourceLocationValue} />,
      url: () => <RenderUrlValue value={value as UrlValue} />,
      text: () => <RenderTextValue value={value as TextValue} />,
    } as const;
    return valueTypeMap[value.type as keyof typeof valueTypeMap]?.() || <RenderDefault value={value} />;
  }

  // Next, deal with primitives.
  const valueTypeMap = {
    bytes: () => <RenderBytesValue value={value} />,
    code: () => <RenderCode value={value} />,
    ms: () => <RenderMSValue value={value} />,
    numeric: () => <RenderNumberValue value={value} heading={heading} />,
    text: () => <RenderText value={value} />,
    thumbnail: () => <RenderThumbnail value={value} />,
    timespanMs: () => <RenderTimespanMs value={value} />,
    url: () => <RenderUrl value={value} />,
  } as const;

  return valueTypeMap[heading?.valueType as keyof typeof valueTypeMap]?.() || <RenderDefault value={value} />;
}

function RenderCodeValue({ value }: { value: CodeValue }) {
  return (
    <code title="code" className="font-mono text-xs">
      {typeof value === 'string' ? value : JSON.stringify(value)}
    </code>
  );
}

function RenderLinkValue({ value }: { value: LinkValue }) {
  return (
    <a
      href={value.url}
      title="link"
      className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
    >
      {value.text}
    </a>
  );
}

function RenderNumericValue({
  value,
  heading,
}: {
  value: NumericValue;
  heading?: TableColumnHeading | null;
}) {
  if (heading?.granularity) {
    return (
      <div title="numeric">
        {value.value.toFixed(-Math.log10(heading.granularity))}
      </div>
    );
  }

  return <div title="numeric">{value.value}</div>;
}

function RenderSourceLocation({ value }: { value: SourceLocationValue }) {
  if (!value.url) {
    return null;
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
      className="break-all text-blue-600 underline hover:text-blue-800"
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
      className="lh-source-location py-1 font-mono text-sm"
      data-source-url={value.url}
      data-source-line={value.line.toString()}
      data-source-column={value.column.toString()}
    >
      {content}
    </div>
  );
}

function RenderUrlValue({ value }: { value: UrlValue }) {
  return (
    <a
      href={value.value}
      title="url"
      className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
    >
      {value.value}
    </a>
  );
}

function RenderTextValue({ value }: { value: TextValue }) {
  return <div title="text">{value.value}</div>;
}

function RenderDefault({ value }: { value: unknown }) {
  return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
}

function RenderBytesValue({ value }: { value: unknown }) {
  const bytes = Number(value);
  const kb = bytes / 1024;
  const mb = kb / 1024;
  return (
    <div title="bytes" className="align-right">
      {mb > 1
        ? `${mb.toFixed(2)} MB`
        : kb > 1
          ? `${kb.toFixed(2)} KB`
          : `${bytes} bytes`}
    </div>
  );
}

function RenderCode({ value }: { value: unknown }) {
  const strValue = String(value);
  return (
    <code title="code" className="font-mono text-xs">
      {strValue}
    </code>
  );
}

function RenderMSValue({ value }: { value: unknown }) {
  const ms = Number(value);
  return <div title="ms">{ms.toFixed(2)} ms</div>;
}

function RenderNumberValue({ value, heading }: { value: unknown, heading?: TableColumnHeading | null }) {
  if (heading?.granularity && value) {
    return (
      <div title="numeric" className="align-right">
        {(value as number).toFixed(-Math.log10(heading.granularity || 1))}
      </div>
    );
  }

  return (
    <div title="numeric" className="align-right">
      {(value as number).toFixed(-Math.log10(heading?.granularity || 1))}
    </div>
  );
}

function RenderText({ value }: { value: unknown }) {
  const strValue = String(value);
  return <div title="text">{strValue}</div>;
}

function RenderUrl({ value }: { value: unknown }) {
  const strValue = String(value);
  if (URL_PREFIXES.some((prefix) => strValue.startsWith(prefix))) {
    return (
      <a
        href={strValue}
        className="block w-[50ch] overflow-hidden text-ellipsis whitespace-nowrap"
      >
        {strValue}
      </a>
    );
  } else {
    // Fall back to <pre> rendering if not actually a URL.
    return <div title="url">{strValue}</div>;
  }
}


function RenderThumbnail({ value }: { value: unknown }) {
  const strValue = `${value}`;
  return <img src={strValue} title={strValue} alt="" />

}


function RenderTimespanMs({ value }: { value: unknown }) {
  const numValue = Number(value);
  return (
    <div title="timespanMs" className="align-right">
      {numValue}
    </div>
  );
}