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

export default function ViewerPage({
  initialSearch = "",
  initialPsi = "",
  
}: {
  initialSearch?: string;
  initialPsi?: string;
}) {
  const [loading, setLoading] = useState(Boolean(initialPsi));
  const [data, setData] = useState<PageSpeedInsights[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [jsonInputs, setJsonInputs] = useState<LhJsonTextEntry[]>([{ name: "", content: "" }]);
  const [jsonFiles, setJsonFiles] = useState<LhJsonFileEntry[]>([]);
  const [psiShareUrl, setPsiShareUrl] = useState(initialPsi);
  const [importedPsiUrl, setImportedPsiUrl] = useState("");
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
        const result = await collectViewerReports("psi", [], [], initialPsi);
        if (cancelled) return;
        setImportedPsiUrl(initialPsi);
        setHash(await encodeViewerHash(result));
      } catch (e) {
        if (cancelled) return;
        console.error("PSI share import error:", e);
        alert(e instanceof Error ? e.message : "Could not import PageSpeed report");
      } finally {
        if (!cancelled) {
          setLoading(false);
          const url = new URL(window.location.href);
          if (url.searchParams.has("psi")) {
            url.searchParams.delete("psi");
            window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPsi, setHash]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await collectViewerReports(activeTab, jsonInputs, jsonFiles, psiShareUrl);
      setImportedPsiUrl(activeTab === "psi" ? psiShareUrl.trim() : "");
      setHash(await encodeViewerHash(result));
    } catch (e) {
      console.error("JSON parsing error:", e);
      alert(e instanceof Error ? e.message : "Invalid JSON");
    } finally {
      setLoading(false);
    }
  };

  if (Array.isArray(data) && data.length) {
    const shareUrl = importedPsiUrl
      ? buildPsiViewerDeepLink(importedPsiUrl, window.location.origin)
      : undefined;
    return (
      <div className="flex flex-col">
        <div className="mb-4">
          <Button
            variant="link"
            onClick={() => {
              setHash("");
            }}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to input
          </Button>
        </div>
        <PageSpeedInsightsDashboard
          data={data}
          labels={labels}
          hideReport
          initialSearch={initialSearch}
          shareUrl={shareUrl}
        />
      </div>
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
          <PsiShareUrlInput psiShareUrl={psiShareUrl} setPsiShareUrl={setPsiShareUrl} />
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
