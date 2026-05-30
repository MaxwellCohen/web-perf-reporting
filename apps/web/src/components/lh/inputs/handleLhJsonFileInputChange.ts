import type React from "react";
import type { LhJsonFileEntry } from "@/components/lh/types";

export function handleLhJsonFileInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setJsonFiles: React.Dispatch<React.SetStateAction<LhJsonFileEntry[]>>,
): void {
  const { files } = e.target;
  if (!files?.length) return;

  const newFiles = Array.from(files).map((file) => ({
    name: file.name.replace(/\.[^/.]+$/, ""),
    file,
  }));
  setJsonFiles((prev) => [...prev, ...newFiles]);
  e.target.value = "";
}
