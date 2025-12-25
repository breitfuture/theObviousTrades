// /src/components/performance/ClientPerformancePanel.tsx
'use client';

import dynamic from 'next/dynamic';

// PerformancePanel lives in /src/components/PerformancePanel.tsx
const PerformancePanel = dynamic(() => import('../PerformancePanel'), {
  ssr: false,
  loading: () => (
    <section className="max-w-6xl mx-auto rounded-2xl border p-4">
      <div className="h-6 w-40 bg-neutral-200 rounded animate-pulse mb-3" />
      <div className="h-72 bg-neutral-100 rounded animate-pulse" />
    </section>
  ),
});

export default function ClientPerformancePanel({ days = 180 }: { days?: number }) {
  return <PerformancePanel days={days} />;
}
