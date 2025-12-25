// src/types/positions.ts
export type Position = {
  id: number | string;
  symbol: string;
  quantity: number;
  avg_cost?: number | null;
  market_price?: number | null;
  market_value?: number | null;
  pnl?: number | null;
  as_of?: string | null; // ISO timestamp (from backend)
};

