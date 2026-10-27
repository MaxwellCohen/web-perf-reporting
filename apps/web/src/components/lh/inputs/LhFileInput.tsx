"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileJson } from "lucide-react";
import type { LhJsonFileEntry } from "@/components/lh/types";
import { handleLhJsonFileInputChange } from "@/components/lh/inputs/handleLhJsonFileInputChange";

type LhFileInputProps = {
  jsonFiles: LhJsonFileEntry[];
  setJsonFiles: React.Dispatch<React.SetStateAction<LhJsonFileEntry[]>>;
  idPrefix?: string;
};

export function LhFileInput({ jsonFiles, setJsonFiles, idPrefix = "" }: LhFileInputProps) {
  const fileInputId = `${idPrefix}json-file`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleLhJsonFileInputChange(e, setJsonFiles);
  };

  const updateFileName = (index: number, name: string) => {
    setJsonFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setJsonFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={fileInputId}>Upload JSON Files</Label>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Input id={fileInputId} type="file" accept=".json" onChange={handleFileChange} multiple />
        </div>
      </div>

      {jsonFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded Files</Label>
          <div className="space-y-3">
            {jsonFiles.map((fileEntry, index) => (
              <div key={index} className="flex items-center gap-2 rounded-md border p-3">
                <FileJson size={20} className="flex-shrink-0 text-sky-400" />
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="flex-shrink-0 truncate text-sm font-medium">
                    {fileEntry.file.name}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <Label htmlFor={`${idPrefix}file-name-${index}`} className="sr-only">
                      Name
                    </Label>
                    <Input
                      id={`${idPrefix}file-name-${index}`}
                      placeholder="Enter a name for this file"
                      value={fileEntry.name}
                      onChange={(e) => updateFileName(index, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
