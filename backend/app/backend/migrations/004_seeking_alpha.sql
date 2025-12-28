-- 00X_seeking_alpha.sql
-- If you don't already have pgcrypto enabled:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.sa_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  as_of_date DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('top_rated', 'quant')),
  original_filename TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  row_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sa_files_type_date
  ON public.sa_files (report_type, as_of_date DESC);

CREATE TABLE IF NOT EXISTS public.sa_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.sa_files(id) ON DELETE CASCADE,
  as_of_date DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('top_rated', 'quant')),

  rank INT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NULL,

  price NUMERIC NULL,
  change_pct NUMERIC NULL,
  quant_rating NUMERIC NULL,

  sa_analyst_rating NUMERIC NULL,
  wall_st_rating NUMERIC NULL,

  valuation_grade TEXT NULL,
  growth_grade TEXT NULL,
  profitability_grade TEXT NULL,
  momentum_grade TEXT NULL,
  eps_rev_grade TEXT NULL,

  sector TEXT NULL,
  industry TEXT NULL,
  market_cap NUMERIC NULL,
  pe_ttm NUMERIC NULL,
  net_income_ttm NUMERIC NULL,
  yield_fwd NUMERIC NULL,
  perf_1m NUMERIC NULL,
  perf_6m NUMERIC NULL,
  ebitda_fwd NUMERIC NULL,
  low_52w NUMERIC NULL,
  high_52w NUMERIC NULL,

  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Prevent duplicate rows for the same symbol on the same report/date.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sa_rows_type_date_symbol
  ON public.sa_rows (report_type, as_of_date, symbol);

CREATE INDEX IF NOT EXISTS idx_sa_rows_symbol_date
  ON public.sa_rows (symbol, as_of_date DESC);
