# app/services/polygon.py
import os
import httpx
from typing import Any, Dict, List, Optional

BASE = "https://api.polygon.io"


def _get_key() -> str:
    key = os.getenv("POLYGON_API_KEY")
    if not key:
        raise RuntimeError("POLYGON_API_KEY not configured")
    return key


async def fetch_daily_aggs(
    symbol: str,
    start: str,
    end: str,
    adjusted: bool = True,
    timeout_s: float = 30.0,
) -> List[Dict[str, Any]]:
    """
    Returns Polygon 'results' list of bars (raw) for 1D candles.
    start/end: YYYY-MM-DD
    """
    api_key = _get_key()

    url = f"{BASE}/v2/aggs/ticker/{symbol.upper()}/range/1/day/{start}/{end}"
    params = {
        "adjusted": "true" if adjusted else "false",
        "sort": "asc",
        "limit": 50000,
        "apiKey": api_key,
    }

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        raise RuntimeError(f"Polygon error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    return data.get("results", [])
