# app/routers/history.py

from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app import db as dbmod

# Single router for all history endpoints
router = APIRouter(prefix="/api/history", tags=["history"])


# ---------- Helpers ----------

def f(x) -> Optional[float]:
    """Best-effort float conversion; returns None on failure."""
    if x is None:
        return None
    try:
        return float(x)
    except Exception:
        return None


def safe_div(n: Optional[float], d: Optional[float]) -> Optional[float]:
    if n is None or d in (None, 0):
        return None
    return n / d


# ---------- Endpoints ----------

@router.get("/snapshots")
def list_snapshots(conn = Depends(dbmod.get_db)) -> List[str]:
    """
    Return distinct snapshot dates from holdings (normalized snapshots),
    newest first.
    """
    rows = conn.execute(text("""
        SELECT DISTINCT as_of::date AS d
        FROM holdings
        WHERE as_of IS NOT NULL
        ORDER BY d DESC
        LIMIT 365
    """)).mappings().all()
    return [str(r["d"]) for r in rows]




@router.get("/positions")
def positions_as_of(
    as_of: date,
    conn = Depends(dbmod.get_db),
) -> Dict[str, Any]:
    """
    Portfolio snapshot for a given date using the holdings/prices tables.
    - Uses positions from holdings.as_of = :as_of
    - Uses prices.date = :as_of when present; falls back to cost_basis
    """

    # ---- 1) Totals ----
    tot = conn.execute(text("""
        WITH snap AS (
            SELECT h.security_id,
                   COALESCE(h.quantity, 0) AS qty,
                   COALESCE(h.cost_basis, 0) AS cost
            FROM holdings h
            WHERE h.as_of = :d
        ),
        px AS (
            SELECT DISTINCT ON (p.security_id)
                   p.security_id, p.close
            FROM prices p
            WHERE p.date = :d
            ORDER BY p.security_id, p.id DESC
        )
        SELECT
            COALESCE(SUM( (COALESCE(px.close, s.cost) * s.qty) ), 0) AS market,
            COALESCE(SUM( (s.cost * s.qty) ), 0)                      AS cost
        FROM snap s
        LEFT JOIN px ON px.security_id = s.security_id
    """), {"d": as_of}).mappings().one()

    tot_market = f(tot["market"])
    tot_cost   = f(tot["cost"])
    pl_abs     = (tot_market or 0.0) - (tot_cost or 0.0)
    pl_pct     = None if (tot_market is None or tot_cost in (None, 0.0)) else (tot_market / tot_cost) - 1.0

    # ---- 2) Per-position breakdown ----
    rows = conn.execute(text("""
        WITH snap AS (
            SELECT h.security_id,
                   COALESCE(h.quantity, 0) AS qty,
                   COALESCE(h.cost_basis, 0) AS cost
            FROM holdings h
            WHERE h.as_of = :d
        ),
        px AS (
            SELECT DISTINCT ON (p.security_id)
                   p.security_id, p.close
            FROM prices p
            WHERE p.date = :d
            ORDER BY p.security_id, p.id DESC
        )
        SELECT
            s.qty,
            s.cost AS avg_cost,
            COALESCE(px.close, s.cost) AS price,
            (COALESCE(px.close, s.cost) * s.qty) AS market_value,
            (s.cost * s.qty) AS cost_value,
            sec.ticker AS symbol
        FROM snap s
        JOIN securities sec ON sec.id = s.security_id
        LEFT JOIN px ON px.security_id = s.security_id
        ORDER BY symbol
    """), {"d": as_of}).mappings().all()

    positions: List[Dict[str, Any]] = []
    for r in rows:
        qty          = f(r["qty"]) or 0.0
        avg_cost     = f(r["avg_cost"])
        price        = f(r["price"])
        market_value = f(r["market_value"]) or 0.0
        cost_value   = f(r["cost_value"]) or 0.0
        pos_pl_abs   = market_value - cost_value
        pos_pl_pct   = None if cost_value == 0 else (market_value / cost_value) - 1.0
        positions.append({
            "symbol": r["symbol"],
            "qty": qty,
            "avg_cost": avg_cost,
            "price": price,
            "market_value": market_value,
            "cost_value": cost_value,
            "pl_abs": pos_pl_abs,
            "pl_pct": pos_pl_pct,
        })

    return {
        "as_of": str(as_of),
        "totals": {
            "market": tot_market,
            "cost": tot_cost,
            "pl_abs": pl_abs,
            "pl_pct": pl_pct,
        },
        "positions": positions,
    }


@router.get("/dashboard-latest")
def get_dashboard_latest(conn = Depends(dbmod.get_db)) -> Dict[str, Any]:
    """
    Use positions_fidelity to build a 'latest dashboard' snapshot:

    - snapshot_as_of (latest as_of in positions_fidelity)
    - total_value               (sum of all current_value)
    - cash_spaxx                (SPAXX / SPAXX** rows)
    - pending_amount            (all PENDING* rows; can be negative)
    - pending_sells             (PENDING* rows with positive current_value)
    - pending_buys              (PENDING* rows with negative current_value)
    - non_cash_positions_value  (everything that's NOT SPAXX* or PENDING*)
    - unrealized_pnl_total      (sum total_gain_dollar)
    - todays_pnl_total          (sum todays_gain_dollar)
    """

    sql = text("""
        WITH latest AS (
            SELECT MAX(as_of) AS as_of
            FROM public.positions_fidelity
        ),
        pos AS (
            SELECT p.*
            FROM public.positions_fidelity p
            JOIN latest l ON p.as_of = l.as_of
        )
        SELECT
            -- snapshot date
            (SELECT as_of FROM latest)                                        AS snapshot_as_of,

            -- total portfolio value (including cash + pending)
            SUM(pos.current_value)                                            AS total_value,

            -- SPAXX / SPAXX** cash
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'SPAXX%%'
                    THEN pos.current_value
                    ELSE 0
                END
            )                                                                 AS cash_spaxx,

            -- net pending (all PENDING* rows; can be negative)
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'PENDING%%'
                    THEN pos.current_value
                    ELSE 0
                END
            )                                                                 AS pending_amount,

            -- pending sells (positive)
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'PENDING%%' AND pos.current_value > 0
                    THEN pos.current_value
                    ELSE 0
                END
            )                                                                 AS pending_sells,

            -- pending buys (negative)
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'PENDING%%' AND pos.current_value < 0
                    THEN pos.current_value
                    ELSE 0
                END
            )                                                                 AS pending_buys,

            -- everything that's NOT SPAXX* or PENDING*
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'SPAXX%%'
                         OR pos.symbol ILIKE 'PENDING%%'
                    THEN 0
                    ELSE pos.current_value
                END
            )                                                                 AS non_cash_positions_value,

            -- P&L aggregates
            SUM(COALESCE(pos.total_gain_dollar, 0))                           AS unrealized_pnl_total,
            SUM(COALESCE(pos.todays_gain_dollar, 0))                          AS todays_pnl_total

        FROM pos;
    """)

    row = conn.execute(sql).mappings().first()

    # If positions_fidelity is empty or MAX(as_of) is null
    if not row or row["snapshot_as_of"] is None:
        raise HTTPException(status_code=404, detail="No snapshots found in positions_fidelity.")

    return dict(row)



@router.get("/activity")
def inferred_activity(
    from_: date = Query(..., alias="from"),
    to:   date = Query(..., alias="to"),
    conn = Depends(dbmod.get_db),
) -> Dict[str, Any]:
    """
    Infer BUY/SELL quantity deltas between two holdings snapshots.
    Uses 'holdings' table quantities by ticker.
    """
    if to < from_:
        raise HTTPException(status_code=400, detail="'to' must be >= 'from'")

    # Snapshot A
    a = conn.execute(text("""
        SELECT sec.ticker AS symbol, COALESCE(SUM(h.quantity), 0) AS qty
        FROM holdings h
        JOIN securities sec ON sec.id = h.security_id
        WHERE h.as_of = :d
        GROUP BY sec.ticker
    """), {"d": from_}).mappings().all()

    # Snapshot B
    b = conn.execute(text("""
        SELECT sec.ticker AS symbol, COALESCE(SUM(h.quantity), 0) AS qty
        FROM holdings h
        JOIN securities sec ON sec.id = h.security_id
        WHERE h.as_of = :d
        GROUP BY sec.ticker
    """), {"d": to}).mappings().all()

    a_map = {r["symbol"]: f(r["qty"]) or 0.0 for r in a}
    b_map = {r["symbol"]: f(r["qty"]) or 0.0 for r in b}
    symbols = sorted(set(a_map) | set(b_map))

    changes: List[Dict[str, Any]] = []
    for sym in symbols:
        old = a_map.get(sym, 0.0)
        new = b_map.get(sym, 0.0)
        delta = new - old
        if abs(delta) < 1e-9:
            continue
        changes.append({
            "symbol": sym,
            "delta_qty": delta,
            "action": "BUY" if delta > 0 else "SELL",
        })

    return {
        "from": str(from_),
        "to": str(to),
        "changes": changes,
    }
