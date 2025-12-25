# app/routers/markets.py
from datetime import date, timedelta
from typing import List, Dict, Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.polygon import fetch_daily_aggs

router = APIRouter(prefix="/api/markets", tags=["markets"])


def timeframe_to_start(tf: str) -> date:
    """Rough conversion of timeframe labels to start date."""
    today = date.today()
    tf = (tf or "").upper()
    if tf == "1D":
        return today - timedelta(days=2)
    if tf == "1M":
        return today - timedelta(days=32)
    if tf == "3M":
        return today - timedelta(days=100)
    if tf == "6M":
        return today - timedelta(days=200)
    if tf == "1Y":
        return today - timedelta(days=370)
    return today - timedelta(days=365 * 5)


@router.get("/bars")
async def get_bars(
    ticker: str = Query(..., min_length=1),
    timeframe: str = Query("6M"),
):
    """
    Return daily OHLC bars for a ticker & timeframe, normalized for the frontend.
    """
    symbol = ticker.upper()
    end = date.today()
    start = timeframe_to_start(timeframe)

    try:
        results = await fetch_daily_aggs(
            symbol=symbol,
            start=f"{start:%Y-%m-%d}",
            end=f"{end:%Y-%m-%d}",
            adjusted=True,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    bars = [
        {
            "time": int(row["t"] / 1000),  # ms → seconds
            "open": row["o"],
            "high": row["h"],
            "low": row["l"],
            "close": row["c"],
        }
        for row in (results or [])
    ]

    return {"bars": bars}


# ---------- BATCH ENDPOINT ----------

class BatchDailyBarsRequest(BaseModel):
    symbols: List[str]
    start: str  # YYYY-MM-DD
    end: str    # YYYY-MM-DD


@router.post("/bars/daily/batch")
async def batch_daily_bars(req: BatchDailyBarsRequest) -> List[Dict[str, Any]]:
    """
    Return daily OHLCV for many symbols in a TA-friendly tidy row format.
    Rows:
      ticker, date, open, high, low, close, volume, vwap, trades
    """
    out: List[Dict[str, Any]] = []

    for sym in req.symbols:
        sym = sym.strip().upper()
        if not sym:
            continue

        try:
            rows = await fetch_daily_aggs(sym, req.start, req.end, adjusted=True)
        except RuntimeError:
            continue

        if not rows:
            continue

        df = pd.DataFrame(rows)
        df["date"] = pd.to_datetime(df["t"], unit="ms").dt.strftime("%Y-%m-%d")
        df = df.rename(
            columns={
                "o": "open",
                "h": "high",
                "l": "low",
                "c": "close",
                "v": "volume",
                "vw": "vwap",
                "n": "trades",
            }
        )
        df["ticker"] = sym

        df = df[
            ["ticker", "date", "open", "high", "low", "close", "volume", "vwap", "trades"]
        ]

        out.extend(df.to_dict(orient="records"))

    return out
