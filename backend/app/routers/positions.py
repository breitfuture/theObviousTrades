# app/routers/positions.py
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from ..db import get_db
import math

router = APIRouter()  # prefix provided by main.py (e.g., "/api/portfolio")

def clean_num(x):
    try:
        if x is None:
            return None
        f = float(x)
        return f if math.isfinite(f) else None
    except Exception:
        return None

@router.get("/positions", tags=["positions"])
def get_positions(db = Depends(get_db)):
    """
    Latest holding per security joined to latest price + prev_close (for day change).
    Uses DISTINCT ON + window function to avoid max(uuid) anti-patterns.

    Returns { "data": [...] } to preserve your existing frontend contract.
    Adds enriched fields:
      - value               (alias of market_value)
      - unrealized_pl       (market_value - cost_value)
      - unrealized_pl_pct   (unrealized_pl / cost_value, guarded)
      - day_change          ((last_price - prev_close) * quantity) when prev_close available
      - day_change_pct      ((last_price - prev_close) / prev_close) when prev_close available
    """
    sql = text("""
        -- 1) Latest row per security in holdings
        WITH latest_holdings AS (
            SELECT DISTINCT ON (h.security_id)
                h.id,
                h.security_id,
                h.account_id,
                h.quantity,
                h.cost_basis
            FROM holdings h
            ORDER BY h.security_id, h.id DESC
        ),
        -- 2) Prices with window LAG to get previous close per security
        ranked_prices AS (
            SELECT
                p.security_id,
                p.id,
                p.close,
                LAG(p.close) OVER (PARTITION BY p.security_id ORDER BY p.id DESC) AS prev_close
            FROM prices p
        ),
        -- 3) Pick the latest price row (with its prev_close)
        latest_prices AS (
            SELECT DISTINCT ON (rp.security_id)
                rp.security_id,
                rp.close      AS last_price,
                rp.prev_close AS prev_close
            FROM ranked_prices rp
            ORDER BY rp.security_id, rp.id DESC
        )
        SELECT
            lh.security_id,
            s.ticker,
            s.name,
            lh.account_id::text                                          AS account_id,
            COALESCE(a.name, '')                                          AS account_name,
            COALESCE(lh.quantity, 0)                                      AS quantity,
            COALESCE(lh.cost_basis, 0)                                    AS cost_basis,
            COALESCE(lp.last_price, lh.cost_basis)                        AS last_price,
            COALESCE(lp.prev_close, NULL)                                 AS prev_close,
            COALESCE(lp.last_price, lh.cost_basis) * COALESCE(lh.quantity, 0) AS market_value,
            COALESCE(lh.cost_basis, 0) * COALESCE(lh.quantity, 0)             AS cost_value
        FROM latest_holdings lh
        LEFT JOIN latest_prices lp ON lp.security_id = lh.security_id
        LEFT JOIN securities s     ON s.id = lh.security_id
        LEFT JOIN accounts a       ON a.id = lh.account_id
        ORDER BY s.ticker NULLS LAST, lh.security_id;
    """)

    rows = db.execute(sql).mappings().all() or []

    out = []
    for r in rows:
        qty         = clean_num(r.get("quantity")) or 0.0
        cost_basis  = clean_num(r.get("cost_basis")) or 0.0
        last_price  = clean_num(r.get("last_price")) or 0.0
        prev_close  = clean_num(r.get("prev_close"))
        market_val  = clean_num(r.get("market_value"))
        cost_val    = clean_num(r.get("cost_value"))

        # fallbacks if DB didn't compute (shouldn't be needed, but safe)
        if market_val is None:
            market_val = qty * last_price
        if cost_val is None:
            cost_val = qty * cost_basis

        # enrichment
        unrealized_pl = (market_val - cost_val) if (market_val is not None and cost_val is not None) else None
        unrealized_pl_pct = (unrealized_pl / cost_val) if (unrealized_pl is not None and cost_val and cost_val != 0) else None

        if prev_close is not None and prev_close != 0:
            day_change = (last_price - prev_close) * qty
            day_change_pct = (last_price - prev_close) / prev_close
        else:
            day_change = None
            day_change_pct = None

        out.append({
            "security_id":  str(r.get("security_id")) if r.get("security_id") is not None else None,
            "ticker":       r.get("ticker"),
            "name":         r.get("name"),
            "account_id":   r.get("account_id"),
            "account_name": r.get("account_name"),
            "quantity":     qty,
            "cost_basis":   cost_basis,
            "last_price":   last_price,
            "prev_close":   prev_close,          # helpful for debugging; keep/remove as you like
            "market_value": market_val,
            "cost_value":   cost_val,

            # New enriched fields:
            "value":              market_val,    # alias for clarity on the frontend
            "unrealized_pl":      unrealized_pl,
            "unrealized_pl_pct":  unrealized_pl_pct,
            "day_change":         day_change,
            "day_change_pct":     day_change_pct,
        })

    return JSONResponse(content={"data": out})
