"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PriceChart, { Bar, LinePoint } from "../../components/charts/PriceChart";
import ChartControls, { Timeframe } from "../../components/charts/ChartControls";
import { getJSON } from "../../lib/api";

// Simple SMA like your old prototype
function sma(bars: Bar[], period: number): LinePoint[] {
  const out: LinePoint[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i - period].close;
    if (i >= period - 1) {
      out.push({ time: bars[i].time, value: sum / period });
    }
  }
  return out;
}

type BarsResponse = {
  bars: Bar[];
};

export default function ChartsPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [tf, setTf] = useState<Timeframe>("6M");
  const [bars, setBars] = useState<Bar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBars = useCallback(
    async (symbol: string, timeframe: Timeframe) => {
      if (!symbol) return;
      try {
        setLoading(true);
        setError(null);

        // This will hit the FastAPI endpoint we’ll create next
        const data = await getJSON<BarsResponse>(
          `/api/markets/bars?ticker=${encodeURIComponent(
            symbol
          )}&timeframe=${timeframe}`
        );

        setBars(data.bars);
        setTicker(symbol);
        setTf(timeframe);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to load chart data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load default chart on first render
  useEffect(() => {
    loadBars("AAPL", "6M");
  }, [loadBars]);

  const ma50 = useMemo(() => (bars ? sma(bars, 50) : []), [bars]);
  const ma200 = useMemo(() => (bars ? sma(bars, 200) : []), [bars]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock Charts</h1>
        <p className="text-sm text-neutral-600">
          Interactive candlestick chart with 50 &amp; 200-day moving averages.
          This will be the foundation for your future A+ trade setup detector.
        </p>
      </div>

      <ChartControls onApply={loadBars} initialTicker={ticker} initialTf={tf} />

      <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200">
        {loading && (
          <p className="text-sm text-neutral-500">Loading chart data…</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && bars && bars.length > 0 && (
          <PriceChart bars={bars} ma50={ma50} ma200={ma200} />
        )}

        {!loading && !error && (!bars || bars.length === 0) && (
          <p className="text-sm text-neutral-500">
            No data available yet for {ticker}.
          </p>
        )}
      </div>
    </div>
  );
}
