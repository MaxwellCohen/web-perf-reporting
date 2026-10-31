"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collectPlatformNotes } from "@/features/page-speed-insights/dashboard-view/collectPlatformNotes";
import type {
  BaselineFeatureNote,
  BaselineNote,
  BaselineTier,
  CspFindingNote,
  PlatformNotes as PlatformNotesData,
} from "@/features/page-speed-insights/dashboard-view/collectPlatformNotes";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<BaselineTier, string> = {
  limited: "limited",
  newly: "newly available",
  widely: "widely available",
};

const TIER_COLOR: Record<BaselineTier, string> = {
  limited: "hsl(var(--chart-3))",
  newly: "hsl(var(--chart-2))",
  widely: "hsl(var(--chart-1))",
};

function severityColor(severity: string | null): string {
  const text = (severity ?? "").toLowerCase();
  if (text.includes("high") || text.includes("syntax")) return TIER_COLOR.limited;
  if (text.includes("medium")) return TIER_COLOR.newly;
  return "hsl(var(--muted-foreground))";
}

function CountLine({ note }: { note: BaselineNote }) {
  const parts = (Object.keys(TIER_LABEL) as BaselineTier[])
    .filter((tier) => note.counts[tier] > 0)
    .map((tier) => `${note.counts[tier]} ${TIER_LABEL[tier]}`);

  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>;
}

function FeatureLink({ feature }: { feature: BaselineFeatureNote }) {
  const className = "inline-flex max-w-full items-center gap-1.5 text-sm";
  const content = (
    <>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: TIER_COLOR[feature.tier] }}
        aria-hidden
      />
      <span className="truncate font-mono text-xs">{feature.id}</span>
    </>
  );

  if (!feature.href) {
    return (
      <span className={className} title={feature.statusLabel}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={feature.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className, "underline-offset-2 hover:underline")}
      title={feature.statusLabel}
    >
      {content}
    </a>
  );
}

function BaselineNoteSection({ note }: { note: BaselineNote }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-sm font-semibold">Baseline</h3>
        {note.asOf ? (
          <span className="text-xs text-muted-foreground">as of {note.asOf}</span>
        ) : null}
      </div>
      <CountLine note={note} />
      {note.highlighted.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {note.highlighted.map((feature) => (
            <FeatureLink key={feature.id} feature={feature} />
          ))}
          {note.hiddenHighlightCount > 0 ? (
            <span className="text-xs text-muted-foreground">+{note.hiddenHighlightCount} more</span>
          ) : null}
        </div>
      ) : null}
      {note.newest ? (
        <p className="text-xs text-muted-foreground">
          Newest feature: <span className="font-mono">{note.newest.id}</span> ({note.newest.year})
        </p>
      ) : null}
    </div>
  );
}

function CspFinding({ finding }: { finding: CspFindingNote }) {
  return (
    <li className="flex min-w-0 items-start gap-2 text-sm">
      {finding.severity ? (
        <span
          className="mt-0.5 shrink-0 text-xs font-semibold"
          style={{ color: severityColor(finding.severity) }}
        >
          {finding.severity}
        </span>
      ) : null}
      <span className="min-w-0">
        <span>{finding.description}</span>
        {finding.directive ? (
          <code className="ml-1 font-mono text-xs text-muted-foreground">{finding.directive}</code>
        ) : null}
      </span>
    </li>
  );
}

function CspNoteSection({ findings }: { findings: CspFindingNote[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Content Security Policy</h3>
      <ul className="flex flex-col gap-1">
        {findings.map((finding, index) => (
          <CspFinding
            key={`${finding.description}-${finding.directive ?? index}`}
            finding={finding}
          />
        ))}
      </ul>
    </div>
  );
}

function PlatformNotes({ notes }: { notes: PlatformNotesData }) {
  return (
    <div className="flex flex-col gap-3">
      {notes.baseline ? <BaselineNoteSection note={notes.baseline} /> : null}
      {notes.csp.length > 0 ? <CspNoteSection findings={notes.csp} /> : null}
    </div>
  );
}

export function PlatformNotesOverview() {
  const items = usePageSpeedItems();
  const cards = items.flatMap((item) => {
    const notes = collectPlatformNotes(item.item.lighthouseResult?.audits);
    return notes ? [{ label: item.label, notes }] : [];
  });

  if (cards.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Platform notes"
      className={cn("grid grid-cols-1 gap-4", cards.length > 1 && "lg:grid-cols-2")}
    >
      {cards.map((card) => (
        <Card key={card.label} className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformNotes notes={card.notes} />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
