'use client';

import { createContext } from 'react';

export const CurrentPerformanceChartContext =
  createContext<string>('Histogram');
