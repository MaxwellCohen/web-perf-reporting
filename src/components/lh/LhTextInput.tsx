'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type LhTextInputProps = {
  jsonInputs: Array<{ name: string; content: string }>;
  setJsonInputs: React.Dispatch<React.SetStateAction<Array<{ name: string; content: string }>>>;
};

export function LhTextInput({ jsonInputs, setJsonInputs }: LhTextInputProps) {
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
