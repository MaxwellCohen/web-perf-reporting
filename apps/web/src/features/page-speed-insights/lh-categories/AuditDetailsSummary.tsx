import ReactMarkdown from "react-markdown";
import { ScoreDisplay } from "@/features/page-speed-insights/ScoreDisplay";
import { getDisagreementText } from "@/features/page-speed-insights/lh-categories/auditStatus";
import { AuditResultsRecord } from "@/lib/schema";
import { recommendationMarkdownComponents } from "@/features/page-speed-insights/RecommendationsSection/recommendationMarkdownComponents";

/** Unwrap block tags / stop link bubbling so this can live inside AccordionTrigger buttons. */
const triggerMarkdownComponents = recommendationMarkdownComponents({
  linkStopPropagation: true,
});

export function AuditDetailsSummary({
  auditData,
  labels,
  acronym,
}: {
  auditData: (AuditResultsRecord[string] | null | undefined)[];
  labels: string[];
  acronym?: string;
}) {
  const title = auditData?.find((audit) => audit?.title)?.title || "";
  const scoreDisplayMode =
    auditData?.find((audit) => audit?.scoreDisplayMode)?.scoreDisplayMode || "";
  const multiple = auditData.length > 1;
  const disagreement = getDisagreementText(auditData, labels);
  const description = auditData?.find((audit) => audit?.description)?.description || "";

  return (
    <div className="flex min-w-0 flex-1 flex-col flex-wrap gap-3 md:flex-row md:gap-4">
      <div className="flex min-w-0 flex-col gap-1 font-bold md:flex-[0_0_21rem]">
        <span className="wrap-break-word underline">
          {title} {acronym ? `(${acronym})` : ""}
        </span>
        {auditData
          .map((audit, i) =>
            audit ? (
              <ScoreDisplay key={`${i}_${audit.id}`} audit={audit} device={multiple ? labels[i] : undefined} />
            ) : null,
          )
          .filter(Boolean)}
        {disagreement ? (
          <span className="w-fit rounded border border-amber-600/40 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
            {disagreement}
          </span>
        ) : null}
        <SmallText
          text={
            scoreDisplayMode === "notApplicable"
              ? "Not Applicable"
              : scoreDisplayMode === "manual"
                ? "Manual validation required"
                : null
          }
        />
      </div>
      {description ? (
        <div className="min-w-0 align-top text-sm no-underline hover:no-underline focus:no-underline md:flex-1 md:text-base">
          <ReactMarkdown components={triggerMarkdownComponents}>{description}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

function SmallText({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="text-xs">{text}</div>;
}
