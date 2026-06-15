"use client";
import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";
import { PageSpeedInsights } from "@/lib/schema";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextEncoding } from "lighthouse/report/renderer/text-encoding";
import pako from "pako";
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
import { parseViewerJsonString } from "@/components/viewer/parseViewerJson";

if (globalThis.window !== undefined) {
  window.pako = pako;
}

function useHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    setHash(window.location.hash);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return [
    hash,
    (newHash: string) => {
      window.location.hash = newHash;
    },
  ] as const;
}

export default function ViewerPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PageSpeedInsights[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [jsonInputs, setJsonInputs] = useState<LhJsonTextEntry[]>([{ name: "", content: "" }]);
  const [jsonFiles, setJsonFiles] = useState<LhJsonFileEntry[]>([]);
  const [activeTab, setActiveTab] = useState("file");
  const [hash, setHash] = useHash();

  useEffect(() => {
    if (!hash) return;
    const urlData = hash.substring(1);
    if (!urlData) return;

    try {
      const text = TextEncoding.fromBase64(urlData, { gzip: true });
      const reports = parseViewerJsonString(text);
      setData(reports);
      setLabels(reports.map((_, index) => `Report ${index + 1}`));
    } catch (e) {
      console.error("Data parsing error:", e);
    }
  }, [hash]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await collectViewerReports(activeTab, jsonInputs, jsonFiles);
      setData(result.data);
      setLabels(result.labels);
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
              setData([]);
              setLabels([]);
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
