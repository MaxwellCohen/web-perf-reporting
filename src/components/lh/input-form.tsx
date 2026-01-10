'use client';

import type React from 'react';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, FileJson, Globe, Code } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LhInputForm() {
  const [jsonInputs, setJsonInputs] = useState<
    Array<{ name: string; content: string }>
  >([{ name: '', content: '' }]);

  const [jsonFiles, setJsonFiles] = useState<
    Array<{ name: string; file: File }>
  >([]);

  const [jsonUrl, setJsonUrl] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch  {
      return false;
    }
  };

  const fetchJsonFromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON from URL: ${response.statusText}`);
    }
    const data = await response.text();
    if (!validateJson(data)) {
      throw new Error('URL did not return valid JSON');
    }
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const processedData: Array<{ name: string; data: any }> = [];

      if (activeTab === 'text') {
        if (jsonInputs.length === 0) {
          throw new Error('Please add at least one JSON entry');
        }

        for (const input of jsonInputs) {
          if (!input.name.trim()) {
            throw new Error('All JSON entries must have a name');
          }
          if (!input.content.trim()) {
            throw new Error(`JSON content for "${input.name}" is empty`);
          }
          if (!validateJson(input.content)) {
            throw new Error(`Invalid JSON format for "${input.name}"`);
          }
          processedData.push({
            name: input.name,
            data: JSON.parse(input.content),
          });
        }
      } else if (activeTab === 'file') {
        if (jsonFiles.length === 0) {
          throw new Error('Please select at least one JSON file');
        }

        for (const fileEntry of jsonFiles) {
          if (!fileEntry.name.trim()) {
            throw new Error('All files must have a name');
          }
          const fileContent = await fileEntry.file.text();
          if (!validateJson(fileContent)) {
            throw new Error(
              `File "${fileEntry.file.name}" does not contain valid JSON`,
            );
          }
          processedData.push({
            name: fileEntry.name,
            data: JSON.parse(fileContent),
          });
        }
      } else if (activeTab === 'url') {
        if (!jsonUrl.trim()) {
          throw new Error('Please enter a URL');
        }
        const jsonData = await fetchJsonFromUrl(jsonUrl);
        processedData.push({
          name: new URL(jsonUrl).hostname,
          data: JSON.parse(jsonData),
        });
      }

      // Here you would typically process the JSON data
      console.log('Processing multiple JSON entries:', processedData);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Lighthouse Report Viewer</CardTitle>
        <CardDescription>View your Lighthouse Report</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <LhTabList />
            <LhTextInput jsonInputs={jsonInputs} setJsonInputs={setJsonInputs} />
            <LhFileInput jsonFiles={jsonFiles} setJsonFiles={setJsonFiles} />
            <LhUrlInput jsonUrl={jsonUrl} setJsonUrl={setJsonUrl} />
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                JSON data has been successfully processed.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Submit'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function LhTabList() {
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

function LhTextInput({
  jsonInputs,
  setJsonInputs,
}: {
  jsonInputs: Array<{ name: string; content: string }>;
  setJsonInputs: React.Dispatch<React.SetStateAction<Array<{ name: string; content: string }>>>;
}) {
  const addJsonInput = () => {
    setJsonInputs((prev) => [...prev, { name: '', content: '' }]);
  };

  const updateJsonInput = (
    index: number,
    field: 'name' | 'content',
    value: string,
  ) => {
    setJsonInputs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeJsonInput = (index: number) => {
    setJsonInputs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <TabsContent value="text">
      <div className="space-y-4">
        <Label>JSON Entries</Label>
        {jsonInputs.map((input, index) => (
          <div key={index} className="relative space-y-2 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`json-name-${index}`} className="w-24">
                Name:
              </Label>
              <Input
                id={`json-name-${index}`}
                placeholder="Entry name"
                value={input.name}
                onChange={(e) => updateJsonInput(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => removeJsonInput(index)}
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
            <div>
              <Label htmlFor={`json-text-${index}`}>JSON Content</Label>
              <Textarea
                id={`json-text-${index}`}
                placeholder='{"example": "Paste your JSON here"}'
                className="mt-1 min-h-[150px] font-mono"
                value={input.content}
                onChange={(e) =>
                  updateJsonInput(index, 'content', e.target.value)
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addJsonInput}
          className="w-full"
        >
          Add Another JSON Entry
        </Button>
      </div>
    </TabsContent>
  );
}

function LhFileInput({
  jsonFiles,
  setJsonFiles,
}: {
  jsonFiles: Array<{ name: string; file: File }>;
  setJsonFiles: React.Dispatch<React.SetStateAction<Array<{ name: string; file: File }>>>;
}) {

  const [error, setError] = useState<string | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        name: file.name.replace(/\.[^/.]+$/, ''), // Default name is filename without extension
        file,
      }));
      setJsonFiles((prev) => [...prev, ...newFiles]);
      setError(null);

      // Reset the file input to allow selecting the same files again
      e.target.value = '';
    }
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
    <TabsContent value="file">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="json-file">Upload JSON Files</Label>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              id="json-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              multiple
            />
          </div>
        </div>

        {jsonFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files</Label>
            <div className="space-y-3">
              {jsonFiles.map((fileEntry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border p-3"
                >
                  <FileJson size={20} className="flex-shrink-0 text-blue-500" />
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="flex-shrink-0 truncate text-sm font-medium">
                      {fileEntry.file.name}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <Label htmlFor={`file-name-${index}`} className="sr-only">
                        Name
                      </Label>
                      <Input
                        id={`file-name-${index}`}
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
    </TabsContent>
  );
}

function LhUrlInput({
  jsonUrl,
  setJsonUrl,
}: {
  jsonUrl: string;
  setJsonUrl: React.Dispatch<React.SetStateAction<string>>;
}) {
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
