

# app/routers/performance.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy import text
from app import db
import csv, io
from datetime import datetime

# NOTE: no prefix here; main.py will mount with prefix="/api/portfolio"
router = APIRouter(tags=["performance"])

# -----------------------------
# 1) CSV UPLOAD (keep existing)
# -----------------------------
# app/routers/performance.py
@router.post("/performance/upload-csv")
async def upload_nav_csv(
    file: UploadFile = File(...),
    conn = Depends(db.get_db),
):
    """
    Accepts a CSV exported from the ROTH PERFORMANCES sheet.

    Expected structure (but tolerant):
      - Column A (no header): values like "Thursday 9/18/2025" or "TRANSFER +750"
      - Column B: "Roth Balance"  (NAV, with $ and commas)
      - Column C: "Dollar Change" (ignored)
      - Column D: "Roth"          (daily percent change, e.g. 1.37%)
      - Column E: "VOO"           (daily percent change, e.g. 0.47%)
      - Column F: "QQQ"           (daily percent change, e.g. 0.98%)

    Behavior:
      - Uses first column as the date, parsing the last token with a slash or dash.
      - Skips rows where the first column starts with 'TRANSFER'.
      - Converts percent strings like '1.37%' into 0.0137 (decimal).
      - Upserts into public.performance_daily:
          day, portfolio_value, portfolio_ret, voo_ret, qqq_ret
    """
    try:
        content = await file.read()
        s = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(s))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row.")

    fieldnames = reader.fieldnames
    first_col = fieldnames[0] if len(fieldnames) > 0 else None
    second_col = fieldnames[1] if len(fieldnames) > 1 else None

    rows = []

    for row in reader:
        if not row:
            continue

        # ---------- 1) DATE ----------
        date_raw = (
            (first_col and row.get(first_col))  # first column (blank header)
            or row.get("Date")
            or row.get("date")
            or row.get("Day")
            or ""
        )
        date_raw = (date_raw or "").strip()

        # Skip empty date cells
        if not date_raw:
            continue

        # Skip TRANSFER rows (deposit notes)
        if date_raw.upper().startswith("TRANSFER"):
            continue

        # If there are no digits at all, also skip (unlikely but safe)
        if not any(ch.isdigit() for ch in date_raw):
            continue

        # Try to extract an actual date like "9/18/2025" or "2025-09-18"
        parsed_date = None
        candidate = date_raw
        parts = date_raw.split()
        for p in reversed(parts):
            if "/" in p or "-" in p:
                candidate = p
                break

        for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
            try:
                parsed_date = datetime.strptime(candidate, fmt).date()
                break
            except Exception:
                continue

        if not parsed_date:
            # Could not parse this row's date, skip it
            continue

        # ---------- 2) BALANCE ----------
        bal_raw = (
            row.get("Roth Balance")
            or row.get("Balance")
            or row.get("balance")
            or row.get("PortfolioValue")
            or row.get("Portfolio Value")
            or (second_col and row.get(second_col))
            or ""
        )
        bal_raw = bal_raw.replace("$", "").replace(",", "").strip()
        if not bal_raw:
            continue
        try:
            bal = float(bal_raw)
        except Exception:
            # bad balance, skip this row
            continue

        # ---------- 3) RETURNS ----------
        port_ret_raw = (
            row.get("Roth")
            or row.get("Portfolio Return")
            or row.get("Return")
            or row.get("portfolio_ret")
            or None
        )
        voo_ret_raw = (
            row.get("VOO")
            or row.get("VOO Return")
            or row.get("voo_ret")
            or None
        )
        qqq_ret_raw = (
            row.get("QQQ")
            or row.get("QQQ Return")
            or row.get("qqq_ret")
            or None
        )

        def to_float_pct(x):
            """
            Convert strings like '1.37%' or '1.37' into decimal 0.0137.
            Returns None if blank or not parseable.
            """
            if x in (None, ""):
                return None
            x_str = str(x).strip()
            if x_str in ("--", "-", "—"):
                return None
            # Remove percent sign if present
            x_str = x_str.replace("%", "")
            try:
                val = float(x_str)
                return val / 100.0
            except Exception:
                return None

        port_ret = to_float_pct(port_ret_raw)
        voo_ret = to_float_pct(voo_ret_raw)
        qqq_ret = to_float_pct(qqq_ret_raw)

        rows.append(
            {
                "day": parsed_date,
                "portfolio_value": bal,
                "portfolio_ret": port_ret,
                "voo_ret": voo_ret,
                "qqq_ret": qqq_ret,
            }
        )

    if not rows:
        raise HTTPException(status_code=400, detail="No usable rows found in CSV.")

    stmt = text(
        """
        INSERT INTO public.performance_daily (
            day, portfolio_value, portfolio_ret, voo_ret, qqq_ret
        )
        VALUES (:day, :portfolio_value, :portfolio_ret, :voo_ret, :qqq_ret)
        ON CONFLICT (day) DO UPDATE
          SET portfolio_value = EXCLUDED.portfolio_value,
              portfolio_ret   = EXCLUDED.portfolio_ret,
              voo_ret         = EXCLUDED.voo_ret,
              qqq_ret         = EXCLUDED.qqq_ret
        """
    )

    for r in rows:
        conn.execute(stmt, r)

    conn.commit()
    return {"rows_upserted": len(rows)}

# ------------------------------------------------
# 2) DAILY SERIES for charts (normalized or raw)
#    Reads public.performance_daily created earlier
# ------------------------------------------------
@router.get("/performance/series")
def get_performance_series(
    days: int = Query(120, ge=1, le=10000),
    conn = Depends(db.get_db),
):
    """
    Return last N days from performance_daily for charts.
    """
    rows = conn.execute(text("""
        SELECT day,
               portfolio_value,  -- your total value incl cash
               voo_value,
               qqq_value,
               portfolio_ret,
               voo_ret,
               qqq_ret
        FROM public.performance_daily
        WHERE day >= CURRENT_DATE - ((:days || ' days')::interval)
        ORDER BY day
    """), {"days": days}).mappings().all()

    return [dict(r) for r in rows]


# ---------------------------------------------------------
# 3) ROLLUPS (compounded returns) — the new endpoint you need
#    This matches your Excel-style compounding of daily returns
# ---------------------------------------------------------
@router.get("/performance/rollups")
def get_performance_rollups(conn = Depends(db.get_db)):
    """
    Compounded returns since start, last 30d, last 7d, and YTD.
    YTD falls back to since_start if the first data point is after Jan 1 of the current year.
    """
    sql = text("""
        WITH bounds AS (
            SELECT
                MIN(day) AS first_day,
                MAX(day) AS last_day,
                date_trunc('year', CURRENT_DATE)::date AS jan1
            FROM public.performance_daily
        ),
        agg AS (
            SELECT
              -- Since start (all rows)
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(portfolio_ret, 0.0)))) - 1.0, 0.0) AS port_all,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(voo_ret,       0.0)))) - 1.0, 0.0) AS voo_all,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(qqq_ret,       0.0)))) - 1.0, 0.0) AS qqq_all,

              -- Last 30 days
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(portfolio_ret, 0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days')) - 1.0, 0.0) AS port_30,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(voo_ret,       0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days')) - 1.0, 0.0) AS voo_30,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(qqq_ret,       0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '30 days')) - 1.0, 0.0) AS qqq_30,

              -- Last 7 days
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(portfolio_ret, 0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days')) - 1.0, 0.0) AS port_7,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(voo_ret,       0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days')) - 1.0, 0.0) AS voo_7,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(qqq_ret,       0.0)))
                     FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days')) - 1.0, 0.0) AS qqq_7,

              -- Raw YTD (from Jan 1 of current year)
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(portfolio_ret, 0.0)))
                     FILTER (WHERE day >= date_trunc('year', CURRENT_DATE)::date)) - 1.0, 0.0) AS port_ytd_raw,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(voo_ret,       0.0)))
                     FILTER (WHERE day >= date_trunc('year', CURRENT_DATE)::date)) - 1.0, 0.0) AS voo_ytd_raw,
              COALESCE(EXP(SUM(LN(1.0 + COALESCE(qqq_ret,       0.0)))
                     FILTER (WHERE day >= date_trunc('year', CURRENT_DATE)::date)) - 1.0, 0.0) AS qqq_ytd_raw
            FROM public.performance_daily
        )
        SELECT
            a.port_all, a.voo_all, a.qqq_all,
            a.port_30, a.voo_30, a.qqq_30,
            a.port_7,  a.voo_7,  a.qqq_7,
            -- YTD with fallback to since_start if first day is after Jan 1
            CASE WHEN b.first_day > b.jan1 THEN a.port_all ELSE a.port_ytd_raw END AS port_ytd,
            CASE WHEN b.first_day > b.jan1 THEN a.voo_all  ELSE a.voo_ytd_raw  END AS voo_ytd,
            CASE WHEN b.first_day > b.jan1 THEN a.qqq_all  ELSE a.qqq_ytd_raw  END AS qqq_ytd
        FROM agg a
        CROSS JOIN bounds b;
    """)
    r = conn.execute(sql).mappings().first() or {}

    return {
        "since_start": {
            "portfolio": r.get("port_all", 0.0),
            "voo":       r.get("voo_all", 0.0),
            "qqq":       r.get("qqq_all", 0.0),
        },
        "last_30d": {
            "portfolio": r.get("port_30", 0.0),
            "voo":       r.get("voo_30", 0.0),
            "qqq":       r.get("qqq_30", 0.0),
        },
        "last_7d": {
            "portfolio": r.get("port_7", 0.0),
            "voo":       r.get("voo_7", 0.0),
            "qqq":       r.get("qqq_7", 0.0),
        },
        "ytd": {
            "portfolio": r.get("port_ytd", 0.0),
            "voo":       r.get("voo_ytd", 0.0),
            "qqq":       r.get("qqq_ytd", 0.0),
        },
    }


