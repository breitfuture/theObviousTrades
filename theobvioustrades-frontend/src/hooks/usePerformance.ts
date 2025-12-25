// /src/hooks/usePerformance.ts
import { useEffect, useState } from 'react';
import { fetchRollups, fetchSeries, Rollups, SeriesPoint } from '../lib/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function usePerformanceData() {
  const [rollups, setRollups] = useState<Rollups | null>(null);
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        const [r, s] = await Promise.all([
          fetchRollups({ signal: ac.signal }),
          fetchSeries({ signal: ac.signal }),
        ]);
        setRollups(r);
        setSeries(s);
        setStatus('success');
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'Failed to load performance data');
          setStatus('error');
        }
      }
    })();

    return () => ac.abort();
  }, []);

  return {
    rollups: rollups ?? {},
    series: series ?? [],
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    error,
  };
}
