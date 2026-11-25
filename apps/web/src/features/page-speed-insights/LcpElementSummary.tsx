import { RenderNodeImage } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import { CompareRunsCard } from "@/features/page-speed-insights/shared/CompareRunsCard";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { LcpElement } from "@/features/page-speed-insights/lcpElement";

/** Longest side of the element screenshot, in px. */
const IMAGE_SIZE = 224;

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function LcpElementBlock({ element, showLabel }: { element: LcpElement; showLabel: boolean }) {
  const { label, node, lcpMs } = element;
  const rect = node.boundingRect;

  return (
    <div className="flex min-w-0 flex-col items-start gap-4 rounded-lg border bg-muted/40 p-3 sm:flex-row">
      <div className="shrink-0">
        <RenderNodeImage item={node} device={label} imageSize={IMAGE_SIZE} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {showLabel ? <span className="text-sm font-semibold">{label}</span> : null}
        <dl className="flex min-w-0 flex-col gap-3">
          {lcpMs != null ? (
            <Fact term="Largest Contentful Paint">
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatMs(lcpMs)}
              </span>
            </Fact>
          ) : null}
          {node.nodeLabel ? (
            <Fact term="Element">
              <span className="line-clamp-3 text-sm text-pretty">{node.nodeLabel}</span>
            </Fact>
          ) : null}
          {node.snippet ? (
            <Fact term="HTML">
              <code className="mt-1 block rounded-md border bg-background px-2 py-1.5 font-mono text-xs leading-5 wrap-anywhere text-sky-400">
                {node.snippet}
              </code>
            </Fact>
          ) : null}
          {rect && rect.width > 0 && rect.height > 0 ? (
            <Fact term="Size on screen">
              <span className="font-mono text-sm tabular-nums">
                {Math.round(rect.width)} × {Math.round(rect.height)} px
              </span>
            </Fact>
          ) : null}
        </dl>
        <RenderJSONDetails
          className="text-xs text-muted-foreground"
          data={node}
          title={`All node data for ${node.lhId || "this element"}`}
        />
      </div>
    </div>
  );
}

export function LcpElementSummary({ elements }: { elements: LcpElement[] }) {
  return (
    <CompareRunsCard
      items={elements}
      testId="lcp-element"
      title="LCP element"
      singleClassName="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4"
      compareKey={(element) => `${element.label}:${element.node.lhId ?? element.node.selector}`}
      singleKey={(element) =>
        `${element.label}:${element.node.lhId ?? element.node.selector ?? element.node.nodeLabel}`
      }
      renderItem={(element, showLabel) => (
        <LcpElementBlock element={element} showLabel={showLabel} />
      )}
    />
  );
}
