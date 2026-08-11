import ReactMarkdown from "react-markdown";
import { ScoreDisplay } from "@/features/page-speed-insights/ScoreDisplay";
import { AuditResultsRecord } from "@/lib/schema";

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
              <ScoreDisplay key={`${i}_${audit.id}`} audit={audit} device={labels[i]} />
            ) : null,
          )
          .filter(Boolean)}
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
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

export function SmallText({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="text-xs">{text}</div>;
}
