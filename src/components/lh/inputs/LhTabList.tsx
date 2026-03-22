'use client';

import { Code, FileJson, Globe } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LhTabList() {
  return (
    <TabsList className="mb-6 grid grid-cols-3">
      <TabsTrigger value="text" className="flex items-center gap-2">
        <Code size={16} />
        <span>Paste Lighthouse JSON</span>
      </TabsTrigger>
      <TabsTrigger value="file" className="flex items-center gap-2">
        <FileJson size={16} />
        <span>Upload Lighthouse JSON File</span>
      </TabsTrigger>
      <TabsTrigger value="url" className="flex items-center gap-2">
        <Globe size={16} />
        <span>Fetch via PageSpeed Insights API</span>
      </TabsTrigger>
    </TabsList>
  );
}
