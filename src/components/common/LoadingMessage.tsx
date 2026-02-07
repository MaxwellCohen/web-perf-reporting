'use client';
import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';

const LOADING_MESSAGES = [
  'Initializing performance tests...',
  'Analyzing Core Web Vitals...',
  'Checking mobile responsiveness...',
  'Evaluating resource optimization...',
  'Measuring server response times...',
  'Calculating layout shifts...',
  'Generating performance insights...',
  'Finalizing report...',
];

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function LoadingMessage() {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(messageInterval);
    };
  }, []);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(visibilityTimer);
  }, []);

  if (!isVisible) return null;

  return (
    
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-2 text-center">
            <div className="mb-4 flex justify-center">
              <Loader2 className="text-primary h-12 w-12 animate-spin" />
            </div>
            <CardTitle className="text-xl">Generating Report</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="text-primary flex items-center font-mono text-3xl font-bold">
                <Clock className="text-muted-foreground mr-3 h-6 w-6" />
                {formatTime(elapsedTime)}
              </div>
              <p className="text-muted-foreground text-sm">Elapsed Time</p>
            </div>

            <div className="flex h-12 items-center justify-center">
              <p className="text-foreground/80 animate-pulse text-lg font-medium transition-all duration-500">
                {LOADING_MESSAGES[messageIndex]}
              </p>
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              {
                "This process may take up to 2 minutes. Please don't close this window."
              }
            </p>
          </CardContent>
        </Card>
      </div> 
  );
}
