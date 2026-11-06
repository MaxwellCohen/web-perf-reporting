"use client";
import type { PageSpeedInsights } from "@/lib/schema";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { validateRun } from "@/components/viewer/viewerRunValidation";
import { Info, Loader2, Plus } from "lucide-react";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";
import { decodeViewerHash, encodeViewerHash } from "@/components/viewer/viewerHash";
import {
  createEmptyViewerRun,
  ViewerRunSlot,
  type ViewerRunState,
} from "@/components/viewer/ViewerRunSlot";
import { buildPsiViewerBookmarklet, buildPsiViewerDeepLink } from "@/lib/viewer/psiBookmarklet";
import { DEFAULT_PSI_RUN_LABEL_A, DEFAULT_PSI_RUN_LABEL_B } from "@/lib/viewer/psiCompareLabels";

// Dashboard pulls recharts + react-markdown + tanstack tables (~730kB
// client per audit). Viewer input form needs none of it; load the dashboard
// only after reports are ready, behind a stable loading boundary.
const PageSpeedInsightsDashboard = dynamic(
  () =>
    import("@/features/page-speed-insights/pageSpeedInsightsDashboard").then(
      (mod) => mod.PageSpeedInsightsDashboard,
    ),
  {
    loading: () => <div className="p-4 text-muted-foreground">Loading report…</div>,
  },
);

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

const getHashSnapshot = () => window.location.hash;
const getServerHashSnapshot = () => "";

function setLocationHash(newHash: string) {
  window.location.hash = newHash.startsWith("#") ? newHash.slice(1) : newHash;
}

function useHash() {
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerHashSnapshot);
  return [hash, setLocationHash] as const;
}

function PsiBookmarkletLink({ href }: { href: string }) {
  return (
    <a
      id="psi-bookmarklet"
      className="underline"
      draggable
      href="#psi-bookmarklet"
      ref={(node) => {
        // React blocks javascript: hrefs. Set the bookmarklet after commit so drag-to-bookmark works.
        if (node) node.setAttribute("href", href);
      }}
    >
      PSI viewer bookmarklet
    </a>
  );
}

const RECENT_KEY = "psi-viewer-recent";
const RECENT_MAX = 5;

const recentListeners = new Set<() => void>();

function subscribeToRecent(onChange: () => void) {
  recentListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    recentListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Raw string snapshot keeps getSnapshot referentially stable between reads.
function getRecentSnapshot(): string {
  try {
    return window.localStorage.getItem(RECENT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

const getServerRecentSnapshot = () => "[]";

function parseRecent(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

function useRecent(): string[] {
  const raw = useSyncExternalStore(subscribeToRecent, getRecentSnapshot, getServerRecentSnapshot);
  return useMemo(() => parseRecent(raw), [raw]);
}

function rememberPsiUrl(url: string) {
  const next = [url, ...parseRecent(getRecentSnapshot()).filter((u) => u !== url)].slice(
    0,
    RECENT_MAX,
  );
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable; recents are best-effort
  }
  recentListeners.forEach((listener) => listener());
}

function initialRunsFromPsiQuery(
  initialPsi: string,
  initialPsi2: string,
  initialPsiLabel: string,
  initialPsi2Label: string,
): ViewerRunState[] {
  if (!initialPsi.trim()) {
    return [createEmptyViewerRun({ id: "run-1" })];
  }

  const primary = createEmptyViewerRun({
    id: "run-1",
    method: "psi",
    psiUrl: initialPsi,
    label: initialPsiLabel,
  });

  if (!initialPsi2.trim()) {
    return [primary];
  }

  return [
    primary,
    createEmptyViewerRun({
      id: "run-2",
      method: "psi",
      psiUrl: initialPsi2,
      label: initialPsi2Label,
    }),
  ];
}

type ImportedPsiShare = {
  url: string;
  label?: string;
  compareUrl?: string;
  compareLabel?: string;
};

function toCollectInput(run: ViewerRunState) {
  return {
    method: run.method,
    label: run.label,
    psiUrl: run.psiUrl,
    jsonFiles: run.jsonFiles,
    jsonInputs: run.jsonInputs,
  };
}

function psiShareFromRuns(runs: ViewerRunState[]): ImportedPsiShare | null {
  if (!runs.every((run) => run.method === "psi")) {
    return null;
  }
  const primary = runs[0];
  if (!primary?.psiUrl.trim()) {
    return null;
  }
  const compare = runs[1];
  return {
    url: primary.psiUrl.trim(),
    label: primary.label.trim() || undefined,
    compareUrl: compare?.psiUrl.trim() || undefined,
    compareLabel: compare?.label.trim() || undefined,
  };
}

export default function ViewerPage({
  initialSearch = "",
  initialPsi = "",
  initialPsi2 = "",
  initialPsiLabel = "",
  initialPsi2Label = "",
}: {
  initialSearch?: string;
  initialPsi?: string;
  initialPsi2?: string;
  initialPsiLabel?: string;
  initialPsi2Label?: string;
}) {
  const [loading, setLoading] = useState(Boolean(initialPsi));
  const [decoded, setDecoded] = useState<{
    hash: string;
    data: PageSpeedInsights[];
    labels: string[];
  } | null>(null);
  const [runs, setRuns] = useState<ViewerRunState[]>(() =>
    initialRunsFromPsiQuery(initialPsi, initialPsi2, initialPsiLabel, initialPsi2Label),
  );
  const [importedPsi, setImportedPsi] = useState<ImportedPsiShare | null>(null);
  const [hash, setHash] = useHash();
  const bookmarkletHref = buildPsiViewerBookmarklet();
  const comparing = runs.length > 1;
  const recent = useRecent();
  const canSubmit = runs.every((run) => validateRun(run).status === "valid");

  // Decode stays async so gzip (pako) loads only when a hash is present.
  useEffect(() => {
    let cancelled = false;
    void decodeViewerHash(hash).then((result) => {
      if (cancelled) return;
      setDecoded({
        hash,
        data: result?.data ?? [],
        labels: result?.labels ?? [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  // Ignore results decoded for a stale hash (e.g. after "Back to input").
  const current = decoded?.hash === hash ? decoded : null;
  const data = current?.data ?? [];
  const labels = current?.labels ?? [];

  useEffect(() => {
    if (!initialPsi) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const queryRuns = initialRunsFromPsiQuery(
          initialPsi,
          initialPsi2,
          initialPsiLabel,
          initialPsi2Label,
        );
        const result = await collectViewerReports(queryRuns.map(toCollectInput));
        if (cancelled) return;
        setImportedPsi(psiShareFromRuns(queryRuns));
        setHash(await encodeViewerHash(result));
      } catch (e) {
        if (cancelled) return;
        console.error("PSI share import error:", e);
        alert(e instanceof Error ? e.message : "Could not import PageSpeed report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPsi, initialPsi2, initialPsiLabel, initialPsi2Label, setHash]);

  const updateRun = (index: number, next: ViewerRunState) => {
    setRuns((prev) => prev.map((run, i) => (i === index ? next : run)));
  };

  const addCompareRun = () => {
    setRuns((prev) => (prev.length >= 2 ? prev : [...prev, createEmptyViewerRun({ id: "run-2" })]));
  };

  const removeCompareRun = () => {
    setRuns((prev) => prev.slice(0, 1));
  };

  const handleSubmit = async (submitRuns: ViewerRunState[] = runs) => {
    setLoading(true);
    try {
      const result = await collectViewerReports(submitRuns.map(toCollectInput));
      setImportedPsi(psiShareFromRuns(submitRuns));
      for (const run of submitRuns) {
        if (run.method === "psi" && run.psiUrl.trim()) rememberPsiUrl(run.psiUrl.trim());
      }
      setHash(await encodeViewerHash(result));
    } catch (e) {
      console.error("JSON parsing error:", e);
      alert(e instanceof Error ? e.message : "Invalid JSON");
    } finally {
      setLoading(false);
    }
  };

  if (Array.isArray(data) && data.length) {
    const shareUrl = importedPsi?.url
      ? buildPsiViewerDeepLink(importedPsi.url, window.location.origin, {
          label: importedPsi.label,
          compareUrl: importedPsi.compareUrl,
          compareLabel: importedPsi.compareLabel,
        })
      : undefined;
    return (
      <PageSpeedInsightsDashboard
        data={data}
        labels={labels}
        hideReport
        initialSearch={initialSearch}
        shareUrl={shareUrl}
        headerStart={
          <Button
            variant="link"
            onClick={() => {
              setHash("");
            }}
            className="shrink-0 px-0 text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to input
          </Button>
        }
      />
    );
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Lighthouse Report Viewer</CardTitle>
          <CardDescription>
            Drop a file, paste JSON, or paste a PageSpeed Insights link.
          </CardDescription>
        </div>
        {recent.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Recent ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-sm">
              {recent.map((url) => (
                <DropdownMenuItem
                  key={url}
                  className="truncate"
                  onSelect={() => updateRun(0, { ...runs[0]!, method: "psi", psiUrl: url })}
                >
                  {url.replace(/^https?:\/\//, "")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className={comparing ? "grid gap-3 md:grid-cols-2" : undefined}>
          {runs.map((run, index) => (
            <ViewerRunSlot
              key={run.id}
              run={run}
              onChange={(next) => updateRun(index, next)}
              onAutoSubmit={
                comparing
                  ? undefined
                  : (next) => {
                      updateRun(index, next);
                      void handleSubmit([next]);
                    }
              }
              title={comparing ? (index === 0 ? "A" : "B") : undefined}
              labelPlaceholder={index === 0 ? DEFAULT_PSI_RUN_LABEL_A : DEFAULT_PSI_RUN_LABEL_B}
              idPrefix={`${run.id}-`}
              onRemove={comparing && index === 1 ? removeCompareRun : undefined}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <div className="flex gap-2">
          {!comparing ? (
            <Button type="button" variant="outline" onClick={addCompareRun}>
              <Plus className="mr-2 h-4 w-4" />
              Compare with…
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-1"
            disabled={loading || !canSubmit}
            onClick={() => void handleSubmit()}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Loading..." : "Show Report"}
          </Button>
        </div>
        <Popover>
          <PopoverTrigger className="flex w-fit items-center gap-1 text-xs text-muted-foreground underline">
            <Info className="h-3 w-3" />
            Bookmarklet help
          </PopoverTrigger>
          <PopoverContent className="w-80 text-xs" align="start">
            Drag <PsiBookmarkletLink href={bookmarkletHref} /> to your bookmarks bar. On a PageSpeed
            Insights report, click it to open the viewer.
          </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
}
