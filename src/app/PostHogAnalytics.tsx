import { Suspense } from 'react';

import PostHogPageView from '@/app/PostHogPageView';

/** Server Component so Suspense counts for static prerender (useSearchParams in child). */
export function PostHogAnalytics() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
