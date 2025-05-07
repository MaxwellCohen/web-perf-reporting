'use client';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { PageSpeedInsights } from '@/lib/schema';
import { useEffect, useRef, useState } from 'react';
import { Details } from '../ui/accordion';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { TextEncoding } from 'lighthouse/report/renderer/text-encoding';
import pako from 'pako';
if (globalThis.window !== undefined) {
  window.pako = pako;
}

function useHash() {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    setHash(window.location.hash);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [hash, setHash] = useHash();

  const handleJsonSubmit = async (jsonString: string) => {
    try {
      const rawData = JSON.parse(jsonString) as unknown;
      setData(
        Array.isArray(rawData)
          ? rawData
          : rawData
            ? [rawData as PageSpeedInsights]
            : [],
      );
    } catch (e) {
      console.error('JSON parsing error:', e);
      alert('Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(!hash) return
    const urlData = hash.substring(1);
    if (!urlData) return;

    try {
      const text = TextEncoding.fromBase64(urlData, { gzip: true });
      const rawData = JSON.parse(text) as unknown;
      setData(
        Array.isArray(rawData)
          ? rawData
          : rawData
            ? [rawData as PageSpeedInsights]
            : [],
      );
    } catch (e) {
      console.error('Data parsing error:', e);
    }
  }, [hash]);

  if (Array.isArray(data) && data.length) {
    return (
      <div className="flex flex-col">
        <div className="mb-4">
          <Button
            variant="link"
            onClick={() => {
              setData([]); 
              setHash('');
            }}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to input
          </Button>
          
        </div>
        <PageSpeedInsightsDashboard data={data} labels={[]} hideReport />
      </div>
    );
  }

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <div className="text-lg font-bold">
          Enter the lighthouse JSON Data here
        </div>
      </summary>
      <Textarea ref={textRef} />
      <Button
        disabled={loading}
        className="mt-4"
        type="button"
        onClick={() => {
          const value = textRef.current?.value;
          if (!value) return;

          setLoading(true);
          setTimeout(() => handleJsonSubmit(value), 0);
        }}
      >
        {loading ? 'Loading...' : 'Show Report'}
      </Button>
    </Details>
  );
}
