"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  BarData,
  Time,
  CandlestickSeries,
  LineSeries,
} from "lightweight-charts";

export type Bar = {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type LinePoint = { time: number; value: number };

type Props = {
  bars: Bar[];
  ma50?: LinePoint[];
  ma200?: LinePoint[];
};

export default function PriceChart({ bars, ma50 = [], ma200 = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use `any` for series to avoid TS fighting the generic types
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const ma50Ref = useRef<any>(null);
  const ma200Ref = useRef<any>(null);

  // Init chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 420,
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: {
        vertLines: { color: "#e5e7eb" },
        horzLines: { color: "#e5e7eb" },
      },
      rightPriceScale: { borderColor: "#9ca3af" },
      timeScale: { borderColor: "#9ca3af" },
    });

    chartRef.current = chart;

    // v5 API: use addSeries with CandlestickSeries / LineSeries
    const candle = chart.addSeries(CandlestickSeries, {});
    candleSeriesRef.current = candle;

    const ma50Series = chart.addSeries(LineSeries, {
      lastValueVisible: false,
      priceLineVisible: false,
      lineWidth: 2,
    });
    const ma200Series = chart.addSeries(LineSeries, {
      lastValueVisible: false,
      priceLineVisible: false,
      lineWidth: 2,
    });

    ma50Ref.current = ma50Series;
    ma200Ref.current = ma200Series;

    const handleResize = () => {
      chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update data whenever bars / MA lines change
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    const candle = candleSeriesRef.current;

    const candleData: BarData[] = bars.map((b) => ({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    candle.setData(candleData);

    if (ma50Ref.current) {
      ma50Ref.current.setData(
        ma50.map((p) => ({ time: p.time as Time, value: p.value }))
      );
    }
    if (ma200Ref.current) {
      ma200Ref.current.setData(
        ma200.map((p) => ({ time: p.time as Time, value: p.value }))
      );
    }

    chartRef.current.timeScale().fitContent();
  }, [bars, ma50, ma200]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl bg-white shadow border border-neutral-200"
    />
  );
}
