"use client";

import { useState } from "react";

export type Timeframe = "1D" | "1M" | "3M" | "6M" | "1Y" | "MAX";

type Props = {
  onApply: (ticker: string, timeframe: Timeframe) => void;
  initialTicker?: string;
  initialTf?: Timeframe;
};

export default function ChartControls({
  onApply,
  initialTicker = "AAPL",
  initialTf = "6M",
}: Props) {
  const [ticker, setTicker] = useState(initialTicker);
  const [tf, setTf] = useState<Timeframe>(initialTf);

  const tfs: Timeframe[] = ["1D", "1M", "3M", "6M", "1Y", "MAX"];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white shadow px-4 py-3 border border-neutral-200">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-700">Symbol</span>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black/70"
          placeholder="AAPL"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-700">Timeframe</span>
        <div className="flex flex-wrap gap-1">
          {tfs.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTf(v)}
              className={`px-2 py-1 rounded-full text-xs border ${
                tf === v
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(ticker.trim(), tf)}
        className="ml-auto rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
      >
        Apply
      </button>
    </div>
  );
}
