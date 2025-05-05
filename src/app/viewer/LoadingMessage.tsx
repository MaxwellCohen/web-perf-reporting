"use client";
import { useState, useEffect } from 'react';

export function LoadingMessage() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [time]);

  return <div className="flex flex-col items-center justify-center">
    Loading Page Speed Insights data is loading...please wait we have lots of tests to run
  </div>;
}
