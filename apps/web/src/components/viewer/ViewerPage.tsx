"use client";
import type { PageSpeedInsights } from "@/lib/schema";
import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Code, FileJson, Globe } from "lucide-react";
import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { LhFileInput } from "@/components/lh/inputs/LhFileInput";
import { LhTextInput } from "@/components/lh/inputs/LhTextInput";
import { PsiShareUrlInput } from "@/components/viewer/PsiShareUrlInput";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";
import { decodeViewerHash, encodeViewerHash } from "@/components/viewer/viewerHash";
import {
  buildPsiViewerBookmarklet,
  buildPsiViewerDeepLink,
} from "@/lib/viewer/psiBookmarklet";

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

type ImportedPsiShare = {
  url: string;
  label?: string;
  compareUrl?: string;
  compareLabel?: string;
};

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
  const [jsonInputs, setJsonInputs] = useState<LhJsonTextEntry[]>([{ name: "", content: "" }]);
  const [jsonFiles, setJsonFiles] = useState<LhJsonFileEntry[]>([]);
  const [psiShareUrl, setPsiShareUrl] = useState(initialPsi);
  const [psiRunLabel, setPsiRunLabel] = useState(initialPsiLabel);
  const [psiCompareUrl, setPsiCompareUrl] = useState(initialPsi2);
  const [psiCompareLabel, setPsiCompareLabel] = useState(initialPsi2Label);
  const [importedPsi, setImportedPsi] = useState<ImportedPsiShare | null>(null);
  const [activeTab, setActiveTab] = useState("psi");
  const [hash, setHash] = useHash();
  const bookmarkletHref = buildPsiViewerBookmarklet();

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
        const compare = initialPsi2.trim()
          ? { url: initialPsi2, label: initialPsi2Label }
          : null;
        const result = await collectViewerReports(
          "psi",
          [],
          [],
          { url: initialPsi, label: initialPsiLabel },
          compare,
        );
        if (cancelled) return;
        setImportedPsi({
          url: initialPsi,
          label: initialPsiLabel.trim() || undefined,
          compareUrl: initialPsi2.trim() || undefined,
          compareLabel: initialPsi2Label.trim() || undefined,
        });
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const compare = psiCompareUrl.trim()
        ? { url: psiCompareUrl, label: psiCompareLabel }
        : null;
      const result = await collectViewerReports(
        activeTab,
        jsonInputs,
        jsonFiles,
        activeTab === "psi" ? { url: psiShareUrl, label: psiRunLabel } : psiShareUrl,
        activeTab === "psi" ? compare : null,
      );
      setImportedPsi(
        activeTab === "psi"
          ? {
              url: psiShareUrl.trim(),
              label: psiRunLabel.trim() || undefined,
              compareUrl: psiCompareUrl.trim() || undefined,
              compareLabel: psiCompareLabel.trim() || undefined,
            }
          : null,
      );
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
          Upload JSON, paste JSON, or import a PageSpeed Insights share link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid grid-cols-3">
            <TabsTrigger value="psi" className="flex items-center gap-2">
              <Globe size={16} />
              <span>PSI share URL</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileJson size={16} />
              <span>Upload JSON files</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Code size={16} />
              <span>Paste JSON</span>
            </TabsTrigger>
          </TabsList>
          <LhFileInput jsonFiles={jsonFiles} setJsonFiles={setJsonFiles} />
          <LhTextInput jsonInputs={jsonInputs} setJsonInputs={setJsonInputs} />
          <PsiShareUrlInput
            psiShareUrl={psiShareUrl}
            setPsiShareUrl={setPsiShareUrl}
            psiRunLabel={psiRunLabel}
            setPsiRunLabel={setPsiRunLabel}
            psiCompareUrl={psiCompareUrl}
            setPsiCompareUrl={setPsiCompareUrl}
            psiCompareLabel={psiCompareLabel}
            setPsiCompareLabel={setPsiCompareLabel}
          />
        </Tabs>
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
