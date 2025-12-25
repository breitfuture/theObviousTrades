BEGIN;

-- Raw “as downloaded” staging table for Fidelity Positions CSV
-- We keep types permissive and store the full original row too (raw_row).
CREATE TABLE IF NOT EXISTS public.positions_fidelity (
  id                  BIGSERIAL PRIMARY KEY,
  as_of               DATE NOT NULL,                  -- date from filename (or today)
  source_filename     TEXT,                           -- original file name for traceability

  account_number      TEXT,
  account_name        TEXT,                           -- sometimes shown as "Account Name" / "Account N"
  symbol              TEXT,
  description         TEXT,
  quantity            NUMERIC,                        -- allow fractional shares
  last_price          NUMERIC,
  last_price_change   NUMERIC,
  current_value       NUMERIC,
  todays_gain_dollar  NUMERIC,
  todays_gain_pct     NUMERIC,
  total_gain_dollar   NUMERIC,
  total_gain_pct      NUMERIC,
  percent_of          NUMERIC,
  cost_basis          NUMERIC,
  average_cost        NUMERIC,
  security_type       TEXT,                           -- "Type" (often shows "Cash" even for ETFs)
  raw_row             JSONB                           -- full untouched input row
);

-- Upsert key so re-uploads update instead of duplicating
CREATE UNIQUE INDEX IF NOT EXISTS uq_positions_fidelity_unique
ON public.positions_fidelity (
  as_of,
  COALESCE(account_number,''),
  COALESCE(symbol,''),
  COALESCE(description,'')
);

COMMIT;
