"use client";
import type { PageSpeedInsights } from "@/lib/schema";
import { useEffect, useState, useSyncExternalStore } from "react";
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
import { Plus } from "lucide-react";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";
import { decodeViewerHash, encodeViewerHash } from "@/components/viewer/viewerHash";
import {
  createEmptyViewerRun,
  ViewerRunSlot,
  type ViewerRunState,
} from "@/components/viewer/ViewerRunSlot";
import {
  buildPsiViewerBookmarklet,
  buildPsiViewerDeepLink,
} from "@/lib/viewer/psiBookmarklet";
import {
  DEFAULT_PSI_RUN_LABEL_A,
  DEFAULT_PSI_RUN_LABEL_B,
} from "@/lib/viewer/psiCompareLabels";

// Dashboard pulls recharts + react-markdown + tanstack tables (~730kB
// client per audit). Viewer input form needs none of it; load the dashboard
// only after reports are ready, behind a stable loading boundary.
const PageSpeedInsightsDashboard = dynamic(
  () =>
    import("@/features/page-speed-insights/pageSpeedInsightsDashboard").then(
      (mod) => mod.PageSpeedInsightsDashboard,
    ),
  { loading: () => <div className="p-4 text-muted-foreground">Loading report…</div> },
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

const PSI_QUERY_KEYS = ["psi", "psi2", "psiLabel", "psi2Label"] as const;

function stripPsiQueryParams() {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of PSI_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
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
  const [data, setData] = useState<PageSpeedInsights[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [runs, setRuns] = useState<ViewerRunState[]>(() =>
    initialRunsFromPsiQuery(initialPsi, initialPsi2, initialPsiLabel, initialPsi2Label),
  );
  const [importedPsi, setImportedPsi] = useState<ImportedPsiShare | null>(null);
  const [hash, setHash] = useHash();
  const bookmarkletHref = buildPsiViewerBookmarklet();
  const comparing = runs.length > 1;

  // Sync from external system (URL hash) — intentional set-state-in-effect.
  // Decode stays async so gzip (pako) loads only when a hash is present.
  useEffect(() => {
    let cancelled = false;
    void decodeViewerHash(hash).then((decoded) => {
      if (cancelled) return;
      if (!decoded) {
        setData([]);
        setLabels([]);
        return;
      }
      setData(decoded.data);
      setLabels(decoded.labels);
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);

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
        if (!cancelled) {
          setLoading(false);
          stripPsiQueryParams();
        }
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
    setRuns((prev) =>
      prev.length >= 2 ? prev : [...prev, createEmptyViewerRun({ id: "run-2" })],
    );
  };

  const removeCompareRun = () => {
    setRuns((prev) => prev.slice(0, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await collectViewerReports(runs.map(toCollectInput));
      setImportedPsi(psiShareFromRuns(runs));
      setHash(await encodeViewerHash(result));
    } catch (e) {
      console.error("JSON parsing error:", e);
      alert(e instanceof Error ? e.message : "Invalid JSON");
    } finally {
      setLoading(false);
    }
  };

  if (Array.isArray(data) && data.length) {
    const shareUrl =
      importedPsi?.url
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
      <CardHeader>
        <CardTitle>Lighthouse Report Viewer</CardTitle>
        <CardDescription>
          Upload JSON, paste JSON, or import a PageSpeed Insights share link. Add a second run to
          compare side-by-side.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {runs.map((run, index) => (
          <ViewerRunSlot
            key={run.id}
            run={run}
            onChange={(next) => updateRun(index, next)}
            title={comparing ? (index === 0 ? "Run A" : "Run B") : "Run"}
            labelPlaceholder={index === 0 ? DEFAULT_PSI_RUN_LABEL_A : DEFAULT_PSI_RUN_LABEL_B}
            idPrefix={`${run.id}-`}
            onRemove={comparing && index === 1 ? removeCompareRun : undefined}
          />
        ))}
        {!comparing ? (
          <Button type="button" variant="outline" className="w-full" onClick={addCompareRun}>
            <Plus className="mr-2 h-4 w-4" />
            Add run to compare
          </Button>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <Button type="button" className="w-full" disabled={loading} onClick={handleSubmit}>
          {loading ? "Loading..." : "Show Report"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Drag <PsiBookmarkletLink href={bookmarkletHref} /> to your bookmarks bar. On a PageSpeed
          Insights report, click it to open the viewer.
        </p>
      </CardFooter>
    </Card>
  );
}
