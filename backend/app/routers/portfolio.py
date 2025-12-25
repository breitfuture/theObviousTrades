# app/routers/portfolio.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import text
from ..db import get_db
import math
from app import db
from typing import List, Dict

router = APIRouter()  # prefix is provided by main.py


def clean_num(x):
    try:
        if x is None:
            return 0.0
        f = float(x)
        return f if math.isfinite(f) else 0.0
    except Exception:
        return 0.0

@router.get("/summary")
def portfolio_summary(conn = Depends(db.get_db)):
    """
    Dashboard KPIs based on latest positions_fidelity snapshot.

    Definitions (Option A):
    - market_value:      total portfolio value (incl. cash + pending)
    - cost_value:        cost basis of ONLY non-cash positions
    - pl_abs:            unrealized P/L for non-cash positions
    - pl_pct:            pl_abs / cost_value
    - cash:              SPAXX + pending
    - invested_pct:      non-cash position value / total_value
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
            (SELECT as_of FROM latest) AS snapshot_as_of,

            -- Total portfolio value (positions + SPAXX + pending)
            SUM(pos.current_value) AS total_value,

            -- SPAXX / SPAXX**
            SUM(
                CASE WHEN pos.symbol ILIKE 'SPAXX%%' THEN pos.current_value ELSE 0 END
            ) AS cash_spaxx,

            -- Pending (cash-in-transit)
            SUM(
                CASE WHEN pos.symbol ILIKE 'PENDING%%' THEN pos.current_value ELSE 0 END
            ) AS pending_amount,

            -- Value of non-cash positions
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'SPAXX%%'
                      OR pos.symbol ILIKE 'PENDING%%'
                    THEN 0
                    ELSE pos.current_value
                END
            ) AS non_cash_positions_value,

            -- Cost basis ONLY for non-cash positions
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'SPAXX%%'
                      OR pos.symbol ILIKE 'PENDING%%'
                    THEN 0
                    ELSE COALESCE(pos.cost_basis, 0)
                END
            ) AS cost_basis_positions,

            -- Unrealized P/L ONLY for non-cash positions
            SUM(
                CASE
                    WHEN pos.symbol ILIKE 'SPAXX%%'
                      OR pos.symbol ILIKE 'PENDING%%'
                    THEN 0
                    ELSE COALESCE(pos.total_gain_dollar, 0)
                END
            ) AS unrealized_pnl_positions

        FROM pos;
    """)

    row = conn.execute(sql).mappings().first()

    if not row or row["total_value"] is None:
        raise HTTPException(status_code=404, detail="No snapshots found in positions_fidelity.")

    # Core values
    total_value = float(row["total_value"])
    cash_spaxx  = float(row["cash_spaxx"] or 0.0)
    pending_amt = float(row["pending_amount"] or 0.0)
    non_cash    = float(row["non_cash_positions_value"] or 0.0)

    cost_basis_positions = float(row["cost_basis_positions"] or 0.0)
    unrealized_positions = float(row["unrealized_pnl_positions"] or 0.0)

    # Dashboard cash = SPAXX + pending
    cash = cash_spaxx + pending_amt

    # Derived metrics
    pl_abs = unrealized_positions
    pl_pct = (pl_abs / total_value) if total_value else None
    invested_pct = (non_cash / total_value) if total_value else 0.0

    return {
        "market_value": total_value,
        "cost_value": cost_basis_positions,
        "invested_value": non_cash,
        "pl_abs": pl_abs,
        "pl_pct": pl_pct,
        "total_value": total_value,
        "cash": cash,
        "invested_pct": invested_pct,
        "total_source": "positions_fidelity",
    }


# ---- Equity Curve (helper + two routes) -------------------------------------

def _equity_curve_rows(conn, window: int) -> List[Dict]:
    """
    Source of truth = public.performance_daily (ROTH PERFORMANCE upload).
    Returns ascending dates for charts: [{date, balance}].
    """
    q = text("""
        SELECT day::date AS d, portfolio_value AS balance
        FROM public.performance_daily
        ORDER BY day DESC
        LIMIT :n
    """)
    rows = list(conn.execute(q, {"n": window}).mappings())
    # reverse to ascending date for charts
    return [{"date": str(r["d"]), "balance": float(r["balance"] or 0)} for r in reversed(rows)]


@router.get("/equity-curve")
def equity_curve(window: int = 60, conn = Depends(db.get_db)):
    """
    Original shape: { series: [{date, balance}], count: N }
    """
    series = _equity_curve_rows(conn, window)
    return {"series": series, "count": len(series)}


@router.get("/equity_curve")
def equity_curve_compat(window: int = 60, conn = Depends(db.get_db)):
    """
    Compatibility alias returning [{date, equity}] for the frontend chart.
    """
    series = _equity_curve_rows(conn, window)
    return [{"date": p["date"], "equity": p["balance"]} for p in series]


# ---- Portfolio performance ---------------------------------------------------

@router.get("/performance", tags=["portfolio"])
def portfolio_performance(db = Depends(get_db)):
    """
    Totals using latest row per security (no max(uuid)).
    DISTINCT ON with ORDER BY id DESC.
    """
    sql = text("""
        WITH latest_holdings AS (
            SELECT DISTINCT ON (h.security_id)
                h.security_id,
                h.quantity,
                h.cost_basis
            FROM holdings h
            ORDER BY h.security_id, h.id DESC
        ),
        latest_prices AS (
            SELECT DISTINCT ON (p.security_id)
                p.security_id,
                p.close
            FROM prices p
            ORDER BY p.security_id, p.id DESC
        )
        SELECT
            COALESCE(SUM(COALESCE(lh.quantity, 0) * COALESCE(lh.cost_basis, 0)), 0) AS total_cost,
            COALESCE(SUM(COALESCE(COALESCE(lp.close, lh.cost_basis), 0) * COALESCE(lh.quantity, 0)), 0) AS total_value
        FROM latest_holdings lh
        LEFT JOIN latest_prices lp ON lp.security_id = lh.security_id;
    """)

    row = db.execute(sql).mappings().first() or {}
    total_cost  = clean_num(row.get("total_cost"))
    total_value = clean_num(row.get("total_value"))

    # Avoid NaN/Inf in JSON
    pl_abs = total_value - total_cost
    pl_pct = None if total_cost == 0 else (total_value / total_cost) - 1

    return JSONResponse(content={
        "data": {
            "total_cost": total_cost,
            "total_value": total_value,
            "pl_abs": pl_abs,
            "pl_pct": pl_pct,
            "as_of": None
        }
    })


"""

# app/routers/portfolio.py
from fastapi import APIRouter, Depends
from sqlalchemy import text
from ..db import get_db
from ..schemas import Summary, PerfPoint
from datetime import date, timedelta

router = APIRouter()

@router.get("/summary", response_model=Summary)
def summary(db = Depends(get_db)):
    # Latest NAV from perf_manual
    last = db.execute(text("select nav from perf_manual order by date desc limit 1")).first()
    equity = float(last[0]) if last else 0.0

    # Simple placeholders until you add real cash/exposure logic
    cash = 0.0
    pct_invested = 1.0 if equity > 0 else 0.0

    # 60-day return from manual series (if present)
    sixty_ago = date.today() - timedelta(days=60)
    p0 = db.execute(
        text("select nav from perf_manual where date>=:d order by date asc limit 1"),
        {"d": sixty_ago},
    ).first()
    period_return = (equity / float(p0[0]) - 1.0) if (p0 and last and float(p0[0]) > 0) else None

    return Summary(
        equity=equity,
        cash=cash,
        pct_invested=pct_invested,
        period_return=period_return,
        max_drawdown=None,
        sector_tilts=[],
    )

@router.get("/equity-curve", response_model=list[PerfPoint])
def equity_curve(db = Depends(get_db), window: int = 60):
    rows = db.execute(text("select date, nav, ret from perf_manual order by date asc")).all()
    out: list[PerfPoint] = []
    for r in rows:
        if window > 0 and (date.today() - r[0]).days > window:
            continue
        out.append(
            PerfPoint(
                date=r[0].isoformat(),
                nav=float(r[1]),
                ret=float(r[2]) if r[2] is not None else None,
            )
        )
    return out
"""