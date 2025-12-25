// /src/lib/api.ts

// -------- Base URL (trims trailing slashes) --------
const BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export function apiUrl(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${clean}`;
}

export type FetchOpts = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

// -------- Generic JSON GET with good errors --------
export async function getJSON<T>(path: string, opts?: FetchOpts): Promise<T> {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: opts?.signal,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GET ${url} failed: ${res.status} ${res.statusText}${
        text ? ` — ${text}` : ""
      }`
    );
  }

  try {
    return (await res.json()) as T;
  } catch (e: any) {
    throw new Error(`Failed to parse JSON from ${url}: ${e?.message ?? e}`);
  }
}

// =====================================
// PERFORMANCE ENDPOINTS (ROTH vs VOO/QQQ)
// =====================================

export type RollupGroup = { portfolio: number; voo: number; qqq: number };

export type Rollups = Partial<{
  since_start: RollupGroup;
  ytd: RollupGroup;
  last_30d: RollupGroup;
  last_7d: RollupGroup;
}>;

export type SeriesPoint = {
  day: string;
  portfolio_value?: number | null;
  voo_value?: number | null;
  qqq_value?: number | null;
  portfolio_ret?: number | null;
  voo_ret?: number | null;
  qqq_ret?: number | null;
};

export const pickVOO = (g?: RollupGroup | null) => g?.voo ?? 0;
export const pickQQQ = (g?: RollupGroup | null) => g?.qqq ?? 0;

export function fetchRollups(opts?: FetchOpts) {
  return getJSON<Rollups>("/api/portfolio/performance/rollups", opts);
}

export function fetchSeries(params?: { days?: number }, opts?: FetchOpts) {
  const q = params?.days ? `?days=${encodeURIComponent(params.days)}` : "";
  return getJSON<SeriesPoint[]>(
    `/api/portfolio/performance/series${q}`,
    opts
  );
}

export async function fetchLatestSeries(opts?: FetchOpts) {
  const rows = await fetchSeries({ days: 1 }, opts);
  return rows?.[rows.length - 1] ?? null;
}

export function pickPortfolio<T extends Record<string, any> | undefined>(g: T) {
  if (!g || typeof g !== "object") return undefined;
  const v = (g as any).portfolio;
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

// ============================
// DASHBOARD LATEST ENDPOINT
// ============================

export type DashboardLatest = {
  snapshot_as_of: string;
  total_value: number;
  cash_spaxx: number;
  pending_amount: number;
  non_cash_positions_value: number;
  unrealized_pnl_total: number;
  todays_pnl_total: number;
  pending_sells?: number;
  pending_buys?: number;
};

export function fetchDashboardLatest(opts?: FetchOpts) {
  return getJSON<DashboardLatest>("/api/history/dashboard-latest", opts);
}

// ============================
// POSITIONS (CLEAN ENDPOINT)
// ============================

export type HistoryPositions = {
  as_of: string;
  totals: {
    market: number;
    cost: number;
    pl_abs: number;
    pl_pct: number | null;
  };
  positions: Array<{
    symbol: string;
    qty: number;
    avg_cost: number | null;
    price: number | null;
    market_value: number;
    cost_value: number;
    pl_abs: number;
    pl_pct: number | null;
  }>;
};

export function fetchPositionsAsOf(as_of: string, opts?: FetchOpts) {
  return getJSON<HistoryPositions>(
    `/api/history/positions?as_of=${encodeURIComponent(as_of)}`,
    opts
  );
}

// -------- Backward-compat shim --------
export async function api<T>(path: string, opts?: FetchOpts): Promise<T> {
  return getJSON<T>(path, opts);
}

export { BASE as API_BASE };
