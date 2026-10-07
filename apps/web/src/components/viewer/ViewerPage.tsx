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
import { Code, FileJson } from "lucide-react";
import type { LhJsonFileEntry, LhJsonTextEntry } from "@/components/lh/types";
import { LhFileInput } from "@/components/lh/inputs/LhFileInput";
import { LhTextInput } from "@/components/lh/inputs/LhTextInput";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";
import { decodeViewerHash, encodeViewerHash } from "@/components/viewer/viewerHash";

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

export default function ViewerPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PageSpeedInsights[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [jsonInputs, setJsonInputs] = useState<LhJsonTextEntry[]>([{ name: "", content: "" }]);
  const [jsonFiles, setJsonFiles] = useState<LhJsonFileEntry[]>([]);
  const [activeTab, setActiveTab] = useState("file");
  const [hash, setHash] = useHash();

  // Sync from external system (URL hash) — intentional set-state-in-effect.
  useEffect(() => {
    const decoded = decodeViewerHash(hash);
    if (!decoded) {
      setData([]);
      setLabels([]);
      return;
    }
    setData(decoded.data);
    setLabels(decoded.labels);
  }, [hash]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await collectViewerReports(activeTab, jsonInputs, jsonFiles);
      setHash(await encodeViewerHash(result));
    } catch (e) {
      console.error("JSON parsing error:", e);
      alert(e instanceof Error ? e.message : "Invalid JSON");
    } finally {
      setLoading(false);
    }
  };

  if (Array.isArray(data) && data.length) {
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
        <PageSpeedInsightsDashboard data={data} labels={labels} hideReport />
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Lighthouse Report Viewer</CardTitle>
        <CardDescription>Upload or paste one or more Lighthouse JSON reports</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid grid-cols-2">
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
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button type="button" className="w-full" disabled={loading} onClick={handleSubmit}>
          {loading ? "Loading..." : "Show Report"}
        </Button>
      </CardFooter>
    </Card>
  );
}
