"use client";

import type React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";

type LhUrlInputProps = {
  jsonUrl: string;
  setJsonUrl: React.Dispatch<React.SetStateAction<string>>;
};

export function LhUrlInput({ jsonUrl, setJsonUrl }: LhUrlInputProps) {
  return (
    <TabsContent value="url">
      <div className="space-y-2">
        <Label htmlFor="json-url">JSON URL</Label>
        <Input
          id="json-url"
          type="url"
          placeholder="https://example.com/data.json"
          value={jsonUrl}
          onChange={(e) => setJsonUrl(e.target.value)}
        />
      </div>
    </TabsContent>
  );
}
