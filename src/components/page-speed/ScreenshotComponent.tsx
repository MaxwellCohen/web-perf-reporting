/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';

export function ScreenshotComponent({
    screenshot,
  }: {
    screenshot?: {
      data: string;
      width: number;
      height: number;
    };
  }) {
    const [imageError, setImageError] = useState(false);
    
    if (!screenshot) {
      return null;
    }
    
    if (imageError || !screenshot.data) {
      return (
        <div className="flex items-center justify-center border bg-gray-100" style={{ width: 80, height: 80 }}>
          <span className="text-xs text-gray-500">Image unavailable</span>
        </div>
      );
    }
    
    return (
      <div className="border">
        <img
          alt={'fullscreen image'}
          width={80}
          src={screenshot.data}
          onError={() => setImageError(true)}
          className={`w-20 aspect-[${screenshot.width}/${screenshot.height}]`}
        />
      </div>
    );
  }