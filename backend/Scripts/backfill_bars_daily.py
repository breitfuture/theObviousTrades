# Scripts/backfill_bars_daily.py
import os
import math
import asyncio
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

from app.services.polygon_grouped import fetch_grouped_daily  # your grouped endpoint wrapper

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

BIGINT_MIN = -9223372036854775808
BIGINT_MAX =  9223372036854775807

ENGINE = None


def require_db():
    if not DATABASE_URL:
        raise RuntimeError("Set DATABASE_URL in your environment/.env")


def get_engine():
    global ENGINE
    if ENGINE is None:
        ENGINE = create_engine(DATABASE_URL, future=True)
    return ENGINE


UPSERT_SQL = text("""
INSERT INTO bars_daily (date, ticker, open, high, low, close, volume, vwap, trades)
VALUES (:date, :ticker, :open, :high, :low, :close, :volume, :vwap, :trades)
ON CONFLICT (date, ticker) DO UPDATE SET
  open   = EXCLUDED.open,
  high   = EXCLUDED.high,
  low    = EXCLUDED.low,
  close  = EXCLUDED.close,
  volume = EXCLUDED.volume,
  vwap   = EXCLUDED.vwap,
  trades = EXCLUDED.trades;
""")


def is_finite_number(x) -> bool:
    try:
        return x is not None and isinstance(x, (int, float)) and math.isfinite(float(x))
    except Exception:
        return False


def safe_float(x) -> Optional[float]:
    return float(x) if is_finite_number(x) else None


def safe_bigint(x) -> Optional[int]:
    """
    Returns an int within BIGINT range or None.
    Handles float NaN/inf, strings, etc.
    """
    try:
        if x is None:
            return None

        if isinstance(x, float):
            if math.isnan(x) or math.isinf(x):
                return None

        # Convert strings like "123" if needed
        if isinstance(x, str):
            x = x.strip()
            if x == "":
                return None
            # If it’s something non-numeric, bail
            x = float(x)

        # Convert to int
        v = int(x)

        # BIGINT range check
        if v < BIGINT_MIN or v > BIGINT_MAX:
            return None

        return v
    except Exception:
        return None


def daterange(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def chunked(lst, n: int):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def summarize_row(r: Dict[str, Any]) -> str:
    return (
        f"{r.get('date')} {r.get('ticker')} "
        f"o={r.get('open')} h={r.get('high')} l={r.get('low')} c={r.get('close')} "
        f"vol={r.get('volume')} vwap={r.get('vwap')} trades={r.get('trades')}"
    )


async def backfill(start: date, end: date):
    require_db()
    engine = get_engine()

    for d in daterange(start, end):
        # Skip weekends (Polygon often returns empty anyway)
        if d.weekday() >= 5:
            continue

        ds = d.strftime("%Y-%m-%d")

        try:
            rows = await fetch_grouped_daily(ds)  # should return a list[dict]
        except Exception as e:
            print(f"{ds}: Polygon ERROR: {e}")
            continue

        if not rows:
            print(f"{ds}: no rows (holiday?)")
            continue

        df = pd.DataFrame(rows)

        # Grouped daily endpoint commonly uses:
        # T = ticker, o/h/l/c, v=volume, vw=vwap, n=trades
        if "T" not in df.columns:
            print(f"{ds}: unexpected payload keys: {list(df.columns)[:30]}")
            continue

        payload: List[Dict[str, Any]] = []
        for _, r in df.iterrows():
            ticker = str(r.get("T", "")).strip().upper()
            if not ticker:
                continue

            payload.append({
                "date": d,  # IMPORTANT: pass actual Python date object
                "ticker": ticker,
                "open":  safe_float(r.get("o")),
                "high":  safe_float(r.get("h")),
                "low":   safe_float(r.get("l")),
                "close": safe_float(r.get("c")),
                "volume": safe_bigint(r.get("v")),
                "vwap":  safe_float(r.get("vw")),
                "trades": safe_bigint(r.get("n")),
            })

        # Commit per-day so one bad day never wipes the whole run
        try:
            with engine.begin() as conn:
                try:
                    conn.execute(UPSERT_SQL, payload)
                    print(f"{ds}: upserted {len(payload)} rows (batch)")
                except Exception as e:
                    print(f"{ds}: batch failed, falling back. Err={e}")

                    ok = 0
                    bad = 0

                    # First fallback: 500-row chunks
                    for ch in chunked(payload, 500):
                        try:
                            conn.execute(UPSERT_SQL, ch)
                            ok += len(ch)
                        except Exception:
                            # Second fallback: isolate the exact bad row(s)
                            for row in ch:
                                try:
                                    conn.execute(UPSERT_SQL, [row])
                                    ok += 1
                                except Exception as e2:
                                    bad += 1
                                    print(f"{ds}: BAD ROW -> {summarize_row(row)} :: {e2}")

                    print(f"{ds}: finished day ok={ok} bad={bad}")

        except Exception as e:
            print(f"{ds}: DB ERROR during upsert (outer): {e}")
            continue


if __name__ == "__main__":
    # START WITH A SHORT TEST WINDOW FIRST (sanity check)
    # After you confirm counts look good, change to a 4-year backfill.

    end = date.today()
    start = date(end.year - 4, 1, 1)

    asyncio.run(backfill(start, end))
